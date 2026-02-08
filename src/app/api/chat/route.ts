import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { anthropic, AI_MODELS } from '@/lib/ai/client';
import { buildMasterSystemPrompt } from '@/lib/ai/prompts/master-system-prompt';
import { generateEmbedding } from '@/lib/pinecone/embeddings';
import { queryPinecone } from '@/lib/pinecone/client';
import { enforceUsageLimits, UsageLimitError } from '@/lib/usage-limits';
import { detectDysregulation, updateRegulationLevel } from '@/lib/regulation/detector';
import { analyzeThinkingQuality } from '@/lib/trace/tracker';
import { z } from 'zod';

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
});

// Minimum message length to trigger TRACE analysis (avoid analyzing very short responses)
const MIN_MESSAGE_LENGTH_FOR_TRACE = 10;

export const POST = withApiHandler(async (req, { requestId }) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  let body;
  try {
    body = chatRequestSchema.parse(await req.json());
  } catch (err: unknown) {
    const message = err instanceof z.ZodError
      ? err.errors.map((e: { message: string }) => e.message).join(', ')
      : 'Invalid request';
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: { include: { iepAccommodations: { where: { active: true } } } } },
  });
  if (!user?.student) {
    throw new NotFoundError('Student profile not found');
  }

  const session = await db.session.findUnique({
    where: { id: body.sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
  });
  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (session.studentId !== user.student.id) {
    throw new ForbiddenError();
  }
  if (session.endedAt) {
    throw new ValidationError('Session has ended');
  }

  try {
    await enforceUsageLimits(user.tenantId, { additionalTokens: 2048 });
  } catch (error) {
    if (error instanceof UsageLimitError) {
      throw new PaymentRequiredError(error.message);
    }
    throw error;
  }

  // Save user message
  const userMessage = await db.message.create({
    data: {
      sessionId: session.id,
      role: 'USER',
      content: body.message,
    },
  });

  // Check for dysregulation signals
  const messageHistory = session.messages.map((m: { role: string; content: string; createdAt: Date }) => ({
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
  const accommodationTypes = user.student.iepAccommodations.map((a: { type: string }) => a.type);

  const sessionHistory = session.messages
    .slice(-20)
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
    .join('\n');

  // RAG: Retrieve relevant curriculum context from Pinecone
  let curriculumContext = '';
  let ragMetrics = { retrieved: 0, durationMs: 0 };

  try {
    const ragStartTime = Date.now();

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
        .map((match: { metadata?: Record<string, unknown>; score?: number }, idx: number) => {
          const metadata = (match.metadata as Record<string, string>) || {};
          const content = metadata.content || metadata.text || 'No content available';
          const source = metadata.source || metadata.title || 'Unknown source';
          const score = match.score?.toFixed(3) || 'N/A';

          return `[Context ${idx + 1}] (Relevance: ${score})\nSource: ${source}\n${content}`;
        })
        .join('\n\n---\n\n');

      logger.info('RAG context retrieved', {
        requestId,
        sessionId: session.id,
        matchCount: matches.length,
        durationMs: ragMetrics.durationMs,
      });
    }
  } catch (error) {
    logger.error('RAG retrieval error', error, { requestId, sessionId: session.id });
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
  const apiMessages = session.messages.map((m: { role: string; content: string }) => ({
    role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
  }));
  apiMessages.push({ role: 'user', content: body.message });

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
    system: systemPrompt,
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }

        // Save assistant message
        await db.message.create({
          data: {
            sessionId: session.id,
            role: 'ASSISTANT',
            content: fullText,
          },
        });

        // Track thinking quality with TRACE protocol (async, don't block response)
        if (body.message.length > MIN_MESSAGE_LENGTH_FOR_TRACE) {
          analyzeThinkingQuality(body.message, fullText)
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
              logger.error('Error tracking TRACE data', error, { requestId, sessionId: session.id });
            });
        }

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

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
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
}, { rateLimit: { windowMs: 60_000, max: 20 } });
