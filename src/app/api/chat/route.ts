import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { anthropic, AI_MODELS } from '@/lib/ai/client';
import { buildMasterSystemPrompt } from '@/lib/ai/prompts/master-system-prompt';
import { generateEmbedding } from '@/lib/pinecone/embeddings';
import { queryPinecone } from '@/lib/pinecone/client';
import { enforceUsageLimits, evaluateOrganizationTokenUsage, UsageLimitError } from '@/lib/usage-limits';
import { detectDysregulation, updateRegulationLevel } from '@/lib/regulation/detector';
import { analyzeThinkingQuality } from '@/lib/trace/tracker';
import { createNVCEvaluation } from '@/lib/nvc/evaluation-service';
import { z } from 'zod';
import { anonymizeForLlmWithMap, reattachPii } from '@/lib/privacy';
import { appendImmutableAuditLog } from '@/lib/audit';
import { getCachedUserProfile, getCachedSession, invalidateSessionCache } from '@/lib/redis/cached-queries';
import { cacheGet, cacheSet, contentHash, CACHE_TTL, CACHE_KEY } from '@/lib/redis/cache';
import { captureException, recordMetric, trackEvent } from '@/lib/monitoring';

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
});

// Minimum message length to trigger TRACE analysis (avoid analyzing very short responses)
const MIN_MESSAGE_LENGTH_FOR_TRACE = 10;

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body;
  try {
    body = chatRequestSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }

  const user = await getCachedUserProfile(clerkId);
  if (!user?.student) {
    return new Response(JSON.stringify({ error: 'Student profile not found' }), { status: 404 });
  }

  const session = await getCachedSession(body.sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
  }
  if (session.studentId !== user.student.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  if (session.endedAt) {
    return new Response(JSON.stringify({ error: 'Session has ended' }), { status: 400 });
  }

  try {
    await enforceUsageLimits(user.tenantId, { additionalTokens: 2048 });
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 402 });
    }
    throw error;
  }

  const usageGuardrail = await evaluateOrganizationTokenUsage(user.tenantId, { additionalTokens: 2048 });
  if (usageGuardrail.spikeDetected) {
    trackEvent('organization.token_usage_spike_detected', {
      organizationId: usageGuardrail.organizationId,
      projectedDailyTokens: usageGuardrail.projectedDailyTokens,
      baselineDailyTokens: usageGuardrail.baselineDailyTokens,
      spikeRatio: Number(usageGuardrail.spikeRatio.toFixed(2)),
      dailyHardLimitTokens: usageGuardrail.dailyHardLimitTokens,
    });
  }

  // Save user message and invalidate session cache
  const userMessage = await db.message.create({
    data: {
      sessionId: session.id,
      role: 'USER',
      content: body.message,
    },
  });
  await invalidateSessionCache(session.id);

  // Check for dysregulation signals
  const messageHistory = session.messages.map((m) => ({
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  }));

  const regulationCheck = detectDysregulation(body.message, messageHistory);
  const currentRegulationState = session.regulationState as { level?: number; signals?: string[]; interventionCount?: number } | null;
  const currentLevel = currentRegulationState?.level ?? 70;
  const newRegulationLevel = updateRegulationLevel(currentLevel, regulationCheck);

  // Update regulation state if changed
  if (newRegulationLevel !== currentLevel || regulationCheck.signals.length > 0) {
    await db.session.update({
      where: { id: session.id },
      data: {
        regulationState: {
          level: newRegulationLevel,
          signals: regulationCheck.signals,
          interventionCount: (currentRegulationState?.interventionCount ?? 0) + (regulationCheck.severity === 'high' ? 1 : 0),
        },
      },
    });
  }

  // Build context for system prompt
  const regulationState = session.regulationState as { level?: number } | null;
  const learningPrefs = user.student.learningPreferences as { modalities?: string[] } | null;
  const accommodationTypes = user.student.iepAccommodations.map(a => a.type);

  const sessionHistory = session.messages
    .slice(-20)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  // RAG: Retrieve relevant curriculum context (with Redis cache)
  let curriculumContext = '';
  let ragMetrics = { retrieved: 0, durationMs: 0 };

  try {
    const ragStartTime = Date.now();
    const grade = String(user.student.gradeLevel ?? 'any');
    const ragCacheKey = CACHE_KEY.curriculum(session.subject, grade, contentHash(body.message));

    // Check cache first
    const cachedRag = await cacheGet<string>(ragCacheKey);
    if (cachedRag) {
      curriculumContext = cachedRag;
      ragMetrics.durationMs = Date.now() - ragStartTime;
      ragMetrics.retrieved = -1; // indicates cache hit
    } else {
      // Generate embedding for the user's query
      const queryEmbedding = await generateEmbedding(body.message);

      // Query Pinecone for relevant curriculum content
      const filter: Record<string, any> = {
        subject: session.subject,
      };

      // Add grade level filter if available
      if (user.student.gradeLevel) {
        filter.gradeLevel = user.student.gradeLevel;
      }

      const matches = await queryPinecone(queryEmbedding, 5, filter);
      ragMetrics.retrieved = matches.length;
      ragMetrics.durationMs = Date.now() - ragStartTime;

      // Format retrieved context
      if (matches.length > 0) {
        curriculumContext = matches
          .map((match, idx) => {
            const metadata = match.metadata as Record<string, any> || {};
            const content = metadata.content || metadata.text || 'No content available';
            const source = metadata.source || metadata.title || 'Unknown source';
            const score = match.score?.toFixed(3) || 'N/A';

            return `[Context ${idx + 1}] (Relevance: ${score})\nSource: ${source}\n${content}`;
          })
          .join('\n\n---\n\n');

        // Cache the formatted RAG context
        await cacheSet(ragCacheKey, curriculumContext, CACHE_TTL.CURRICULUM);

        console.log(`RAG: Retrieved ${matches.length} curriculum contexts in ${ragMetrics.durationMs}ms for session ${session.id}`);
      }
    }
  } catch (error) {
    console.error(`RAG retrieval error for session ${session.id}:`, error);
    // Continue without RAG context if Pinecone fails
    curriculumContext = '';
  }

  const systemPrompt = buildMasterSystemPrompt({
    currentPhase: session.currentPhase,
    gradeLevel: user.student.gradeLevel,
    subject: session.subject,
    regulationBaseline: regulationState?.level ?? 70,
    accommodations: accommodationTypes,
    modalities: learningPrefs?.modalities ?? [],
    sessionHistory,
    topicContext: curriculumContext,
    engagementMode: session.engagementMode,
  });

  // Build message history for API call
  const piiTokenMap: Record<string, string> = {};
  const apiMessages = session.messages.map(m => ({
    role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: anonymizeForLlmWithMap(m.content, piiTokenMap).sanitizedText,
  }));
  const anonymizedInput = anonymizeForLlmWithMap(body.message, piiTokenMap);
  apiMessages.push({ role: 'user', content: anonymizedInput.sanitizedText });

  // Filter consecutive same-role messages (Anthropic requires alternating)
  const filteredMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const msg of apiMessages) {
    if (filteredMessages.length === 0 || filteredMessages[filteredMessages.length - 1].role !== msg.role) {
      filteredMessages.push(msg);
    } else {
      filteredMessages[filteredMessages.length - 1].content += '\n' + msg.content;
    }
  }
  // Ensure first message is from user
  if (filteredMessages.length > 0 && filteredMessages[0].role !== 'user') {
    filteredMessages.shift();
  }

  const startTime = Date.now();

  // Stream response
  const stream = await anthropic.messages.stream({
    model: AI_MODELS.primary,
    max_tokens: 1024,
    system: anonymizeForLlmWithMap(systemPrompt, piiTokenMap).sanitizedText,
    messages: filteredMessages,
  });

  const encoder = new TextEncoder();
  let fullText = '';

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullText += event.delta.text;
            const deidentifiedChunk = reattachPii(event.delta.text, anonymizedInput.tokenMap);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: deidentifiedChunk })}\n\n`));
          }
        }

        const restoredAssistantText = reattachPii(fullText, anonymizedInput.tokenMap);

        // Save assistant message and invalidate session cache
        const assistantMessage = await db.message.create({
          data: {
            sessionId: session.id,
            role: 'ASSISTANT',
            content: restoredAssistantText,
          },
        });
        await invalidateSessionCache(session.id);

        // Track thinking quality with TRACE protocol (async, don't block response)
        if (body.message.length > MIN_MESSAGE_LENGTH_FOR_TRACE) {
          analyzeThinkingQuality(body.message, restoredAssistantText)
            .then(async (traceData) => {
              if (!traceData) return;

              // Save thinking assessment
              await db.thinkingAssessment.create({
                data: {
                  sessionId: session.id,
                  assessmentType: 'INTEGRATED',
                  reasoningArticulation: traceData.thinkingQualityScores.reasoningArticulation,
                  assumptionAwareness: traceData.thinkingQualityScores.assumptionAwareness,
                  evidenceEvaluation: traceData.thinkingQualityScores.evidenceEvaluation,
                  alternativePerspectives: traceData.thinkingQualityScores.alternativePerspectives,
                  conclusionJustification: traceData.thinkingQualityScores.conclusionJustification,
                  metacognitiveAwareness: traceData.thinkingQualityScores.metacognitiveAwareness,
                  fluency: traceData.creativityIndicators.fluency,
                  flexibility: traceData.creativityIndicators.flexibility,
                  originality: traceData.creativityIndicators.originality,
                  elaboration: traceData.creativityIndicators.elaboration,
                  riskTaking: traceData.creativityIndicators.riskTaking,
                  modeUsed: session.engagementMode,
                  reasoningMovesUsed: traceData.reasoningMovesUsed,
                  rawResponse: body.message,
                },
              });

              // Update reasoning move progress for detected moves
              for (const move of traceData.reasoningMovesUsed) {
                await db.reasoningMoveProgress.upsert({
                  where: {
                    studentId_move: {
                      studentId: user.student!.id,
                      move,
                    },
                  },
                  update: {
                    usageCount: { increment: 1 },
                    spontaneousUsage: { increment: 1 },
                  },
                  create: {
                    studentId: user.student!.id,
                    move,
                    introducedAt: new Date(),
                    usageCount: 1,
                    spontaneousUsage: 1,
                    promptedUsage: 0,
                    proficiencyLevel: 1,
                  },
                });
              }
            })
            .catch((error) => {
              captureException(error, {
                tags: { endpoint: 'chat', phase: 'trace_analysis' },
                extra: { sessionId: session.id },
              });
            });
        }

        // Evaluate NVC compliance (async, don't block response)
        const conversationContext = session.messages
          .slice(-5)
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        createNVCEvaluation({
          messageId: assistantMessage.id,
          sessionId: session.id,
          tenantId: user.tenantId,
          assistantResponse: restoredAssistantText,
          conversationContext,
        }).catch((error) => {
          captureException(error, {
            tags: { endpoint: 'chat', phase: 'nvc_evaluation' },
            extra: { sessionId: session.id, messageId: assistantMessage.id },
          });
        });

        // Track AI usage
        const finalMessage = await stream.finalMessage();
        const latencyMs = Date.now() - startTime;
        const inputTokens = finalMessage.usage.input_tokens;
        const outputTokens = finalMessage.usage.output_tokens;

        await db.aIUsageLedger.create({
          data: {
            tenantId: user.tenantId,
            sessionId: session.id,
            userId: user.id,
            requestType: 'TUTOR_CONVERSATION',
            model: AI_MODELS.primary,
            promptVersion: '1.0',
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            costUSD: (inputTokens * 0.003 + outputTokens * 0.015) / 1000,
            latencyMs,
            success: true,
            feature: 'CORE_TUTORING',
            subject: session.subject,
          },
        });

        // Record latency metric for monitoring dashboards
        await recordMetric('chat.latency_ms', latencyMs, {
          model: AI_MODELS.primary,
          subject: session.subject,
        });

        await recordMetric('chat.organization_tokens_projected_daily', usageGuardrail.projectedDailyTokens, {
          tenantId: usageGuardrail.organizationId,
          subject: session.subject,
        });

        if (usageGuardrail.spikeDetected) {
          await recordMetric('chat.organization_token_spike_ratio', usageGuardrail.spikeRatio, {
            tenantId: usageGuardrail.organizationId,
            subject: session.subject,
          });
        }


        await appendImmutableAuditLog({
          tenantId: user.tenantId,
          userId: user.id,
          action: 'LLM_CHAT_COMPLETED',
          resource: 'Session',
          resourceId: session.id,
          metadata: {
            anonymizationTokens: Object.keys(anonymizedInput.tokenMap).length,
            inputLength: body.message.length,
          },
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
        await captureException(err, {
          tags: { endpoint: 'chat', phase: 'stream' },
          extra: { sessionId: session.id },
          userId: user.id,
          tenantId: user.tenantId,
        });
        const errorMessage = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
