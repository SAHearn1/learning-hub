import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { anthropic, AI_MODELS } from '@/lib/ai/client';
import { buildMasterSystemPrompt } from '@/lib/ai/prompts/master-system-prompt';
import { searchCurriculum, formatCurriculumContext } from '@/lib/vector-search';
import { enforceUsageLimits, UsageLimitError, evaluateOrganizationTokenUsage } from '@/lib/usage-limits';
import { detectDysregulation, updateRegulationLevel, analyzeSentiment } from '@/lib/regulation/detector';
import { classifySentiment, formatInterventionMessage } from '@/lib/regulation/sentiment-classifier';
import { analyzeThinkingQuality } from '@/lib/trace/tracker';
import { createNVCEvaluation } from '@/lib/nvc/evaluation-service';
import { z } from 'zod';
import { anonymizeForLlmWithMap, reattachPii } from '@/lib/privacy';
import { appendImmutableAuditLog } from '@/lib/audit';
import { getCachedUserProfile, getCachedSession, invalidateSessionCache } from '@/lib/redis/cached-queries';
import { cacheGet, cacheSet, contentHash, CACHE_TTL, CACHE_KEY } from '@/lib/redis/cache';
import { captureException, recordMetric, trackEvent } from '@/lib/monitoring';
import { computePhaseTransition, buildFiveRStateSnapshot } from '@/lib/five-rs/state-machine';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { UnauthorizedError, NotFoundError, ForbiddenError, BadRequestError, PaymentRequiredError } from '@/lib/api-errors';
import type { SourceCitation } from '@/types/chat';

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
});

// Minimum message length to trigger TRACE analysis (avoid analyzing very short responses)
const MIN_MESSAGE_LENGTH_FOR_TRACE = 10;

/**
 * Construct GitHub URL for a source file
 */
function constructSourceUrl(filename: string): string {
  const baseUrl = 'https://github.com/SAHearn1/learning-hub/blob/main';
  // Ensure filename has proper path
  const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
  return `${baseUrl}${cleanPath}`;
}

const FINLIT_SUBJECT = 'FINANCIAL_LITERACY';
const FINLIT_KEYWORDS = [
  'compound interest', 'interest rate', 'budget', 'budgeting', 'saving', 'savings',
  'invest', 'investing', 'stock', 'stocks', 'bond', 'bonds', 'etf', 'retirement',
  'credit', 'debt', 'loan', 'apr', 'mortgage', 'portfolio', 'diversification',
];
const PERSONAL_TRADE_PATTERNS = [
  /should\s+i\s+buy\b/i,
  /what\s+stock\s+should\s+i\s+buy\b/i,
  /buy\s+[a-z]{1,6}\s+(today|now)\b/i,
  /is\s+now\s+a\s+good\s+time\s+to\s+buy\b/i,
  /predict\s+.*price/i,
];

function messageSuggestsFinlit(message: string): boolean {
  const normalized = message.toLowerCase();
  return FINLIT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function buildRetrievalSubjects(message: string, sessionSubject?: string | null): string[] | undefined {
  if (sessionSubject === FINLIT_SUBJECT) {
    return [FINLIT_SUBJECT];
  }

  if (messageSuggestsFinlit(message)) {
    const subjects = new Set<string>([FINLIT_SUBJECT]);
    if (sessionSubject) {
      subjects.add(sessionSubject);
    }
    return Array.from(subjects);
  }

  return undefined;
}

function isPersonalTradeAdviceRequest(message: string): boolean {
  return PERSONAL_TRADE_PATTERNS.some((pattern) => pattern.test(message));
}


export async function POST(req: NextRequest) {
  const user = await requireUser();

  if (!user.student) {
    throw new NotFoundError('Student profile not found');
  }

  const body = chatRequestSchema.parse(await req.json());

  const session = await getCachedSession(body.sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (session.studentId !== user.student.id) {
    throw new ForbiddenError('Access to this session is forbidden');
  }
  if (session.endedAt) {
    throw new BadRequestError('Session has ended');
  }

  try {
    await enforceUsageLimits(user.tenantId, { additionalTokens: 2048 });
  } catch (error) {
    if (error instanceof UsageLimitError) {
      throw new PaymentRequiredError(error.message);
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
  const sentiment = analyzeSentiment(body.message, regulationCheck);
  const currentRegulationState = session.regulationState as { level?: number; signals?: string[]; interventionCount?: number } | null;
  const currentLevel = currentRegulationState?.level ?? 70;
  const newRegulationLevel = updateRegulationLevel(currentLevel, regulationCheck);
  const nextPhase = computePhaseTransition(session.currentPhase, {
    regulationLevel: newRegulationLevel,
    sentiment,
  });
  const previousStateMachine = (session.metadata as { fiveRState?: { phaseHistory?: Array<{ phase: 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT'; timestamp: string; reason: string }> } } | null)?.fiveRState;
  const nextFiveRState = buildFiveRStateSnapshot({
    currentPhase: session.currentPhase,
    nextPhase,
    previousHistory: previousStateMachine?.phaseHistory ?? [],
    sentiment,
    regulationLevel: newRegulationLevel,
  });

  // Persist regulation updates and enforce the 5Rs FSM progression.
  if (
    newRegulationLevel !== currentLevel ||
    regulationCheck.signals.length > 0 ||
    session.currentPhase !== nextPhase
  ) {
    await db.session.update({
      where: { id: session.id },
      data: {
        currentPhase: nextPhase,
        regulationState: JSON.parse(JSON.stringify({
          level: newRegulationLevel,
          signals: regulationCheck.signals,
          interventionCount: (currentRegulationState?.interventionCount ?? 0) + (regulationCheck.severity === 'high' ? 1 : 0),
          sentiment,
          regulationPassed: nextFiveRState.regulationPassed,
        })),
        metadata: {
          ...(session.metadata as Record<string, unknown> ?? {}),
          fiveRState: nextFiveRState,
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SENTIMENT CLASSIFICATION LAYER (Pre-RAG)
  // ═══════════════════════════════════════════════════════════════
  // This classification layer runs BEFORE the RAG pipeline to detect
  // high-stress patterns and inject regulation exercises when needed.
  // When high stress is detected, we bypass RAG entirely and return
  // a regulation intervention immediately.
  //
  // WHY PRE-RAG?
  // - Ensures immediate emotional support (< 50ms latency)
  // - Prevents academic content from being mixed with regulation needs
  // - Trauma-informed: prioritize safety/regulation before learning
  //
  // STRESS DETECTION APPROACH:
  // - Pattern matching on content (no ML inference needed)
  // - Considers cumulative stress from recent message history
  // - Multiple thresholds: crisis, high, medium, low
  //
  // HIGH-PRIORITY PATTERNS:
  // - Panic/overwhelm: "I can't breathe", "freaking out"
  // - Crisis language: "I want to give up", "hate myself"
  // - Acute distress: "I'm so scared", "can't stop crying"

  const sentimentClassification = classifySentiment(
    body.message,
    messageHistory,
    newRegulationLevel
  );

  // Log sentiment classification for monitoring
  console.log(`Sentiment classification for session ${session.id}:`, {
    stressLevel: sentimentClassification.stressLevel,
    shouldIntervene: sentimentClassification.shouldIntervene,
    patterns: sentimentClassification.detectedPatterns,
  });

  // If high stress detected, return regulation intervention and bypass RAG
  if (sentimentClassification.shouldIntervene && sentimentClassification.exercise) {
    try {
      // Format the intervention message
      const interventionContent = formatInterventionMessage(sentimentClassification.exercise);

      // Save the intervention as an assistant message
      await db.message.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: interventionContent,
        },
      });

      // Update session phase to REGULATE
      await db.session.update({
        where: { id: session.id },
        data: {
          currentPhase: 'REGULATE',
        },
      });

      // Invalidate session cache
      await invalidateSessionCache(session.id);

      // Stream the intervention response back to client
      // Using same format as normal streaming: { text: "..." }
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          // Send the complete intervention message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: interventionContent })}\n\n`));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.error('Error creating intervention response:', error);
      captureException(error as Error);
      // Continue with normal flow if intervention fails (graceful degradation)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NORMAL TUTORING FLOW (No intervention needed)
  // ═══════════════════════════════════════════════════════════════

  // Build context for system prompt
  const regulationState = { level: newRegulationLevel };
  const learningPrefs = user.student.learningPreferences as { modalities?: string[] } | null;
  const accommodationTypes = user.student.iepAccommodations.map(a => a.type);

  const sessionHistory = session.messages
    .slice(-20)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  // RAG: Retrieve relevant curriculum context (with Redis cache)
  let curriculumContext = '';
  let ragMetrics = { retrieved: 0, durationMs: 0 };
  let citations: SourceCitation[] = [];
  const retrievalSubjects = buildRetrievalSubjects(body.message, session.subject);
  const isFinlitSession = session.subject === FINLIT_SUBJECT;

  try {
    const ragStartTime = Date.now();
    const grade = String(user.student.gradeLevel ?? 'any');
    const ragSubjectKey = retrievalSubjects?.slice().sort().join(',') || session.subject;
    const ragCacheKey = CACHE_KEY.curriculum(ragSubjectKey, grade, contentHash(body.message));

    const cachedRag = await cacheGet<string>(ragCacheKey);
    if (cachedRag) {
      curriculumContext = cachedRag;
      ragMetrics.durationMs = Date.now() - ragStartTime;
      ragMetrics.retrieved = -1;
    } else {
      const results = await searchCurriculum(body.message, {
        subject: retrievalSubjects ? undefined : session.subject,
        subjects: retrievalSubjects,
        gradeLevel: user.student.gradeLevel ?? undefined,
        topK: 5,
        minScore: 0.3,
      });

      ragMetrics.retrieved = results.length;
      ragMetrics.durationMs = Date.now() - ragStartTime;

      if (results.length > 0) {
        citations = results.map((result, idx) => ({
          id: `citation-${idx}`,
          filename: result.filename || 'Unknown',
          chunkIndex: idx,
          totalChunks: results.length,
          text: result.text || '',
          relevanceScore: result.score ?? 0,
          sourceUrl: constructSourceUrl(result.filename || ''),
          subject: result.subject || '',
          gradeLevel: result.gradeLevel ?? 0,
          standardCodes: result.standardCodes || [],
        }));

        curriculumContext = formatCurriculumContext(results);
        await cacheSet(ragCacheKey, curriculumContext, CACHE_TTL.CURRICULUM);
        console.log(`RAG: Retrieved ${results.length} curriculum contexts in ${ragMetrics.durationMs}ms for session ${session.id}`);
      }
    }
  } catch (error) {
    console.error(`RAG retrieval error for session ${session.id}:`, error);
    curriculumContext = '';
    citations = [];
  }

  const usedFinlitContext = citations.some(c => c.subject === FINLIT_SUBJECT);
  // Update guardrail context with retrieved RAG content for post-generation checks
  guardrailContext.ragContext = [curriculumContext, iepContext].filter(Boolean).join('\n\n');

  // Combine curriculum context for the topic context
  const combinedTopicContext = curriculumContext;

  const finlitSafetyInstructions = usedFinlitContext || isFinlitSession || messageSuggestsFinlit(body.message)
    ? `\n\n### Financial Literacy Safety\n- Financial literacy content is educational only, not financial advice.\n- Do not recommend specific trades, stocks, or timing decisions.\n- Do not predict security prices.\n- Cite relevant FINANCIAL_LITERACY sources when available.\n- If no financial literacy sources are available, ask a clarifying question before giving specific guidance.`
    : '';

  const systemPrompt = buildMasterSystemPrompt({
    currentPhase: nextPhase,
    gradeLevel: user.student.gradeLevel,
    subject: session.subject,
    regulationBaseline: regulationState?.level ?? 70,
    accommodations: accommodationTypes,
    modalities: learningPrefs?.modalities ?? [],
    sessionHistory,
    topicContext: combinedTopicContext,
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

  if (isPersonalTradeAdviceRequest(body.message)) {
    const refusalMessage = `I can’t provide personalized buy/sell recommendations or price predictions. I can help with general investing principles for learning, such as diversification, risk tolerance, and long-term planning. ${usedFinlitContext ? 'This is educational only, not financial advice.' : 'Tell me what concept you want to learn, and I can explain it with educational examples.'}`;

    await db.message.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: refusalMessage,
        metadata: citations.length > 0 ? { citations } : null,
      },
    });
    await invalidateSessionCache(session.id);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: refusalMessage })}\n\n`));
        if (citations.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ citations })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
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

  // Stream response
  const stream = await anthropic.messages.stream({
    model: AI_MODELS.primary,
    max_tokens: 1024,
    system: anonymizeForLlmWithMap(`${systemPrompt}${finlitSafetyInstructions}`, piiTokenMap).sanitizedText,
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
            metadata: citations.length > 0 ? { citations } : null,
          },
        });
        await invalidateSessionCache(session.id);

        // TODO: Add guardrail post-checks and HITL review when implemented
        // if (!postCheck.passed || postCheck.confidenceScore < 0.7) {
        //   await createSuggestionReview({ ... });
        // }

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
        
        // Send citations if available
        if (citations.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ citations })}\n\n`));
        }
        
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
