import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { anthropic, AI_MODELS } from '@/lib/ai/client';
import { buildMasterSystemPrompt } from '@/lib/ai/prompts/master-system-prompt';
import { enforceUsageLimits, UsageLimitError } from '@/lib/usage-limits';
import { detectDysregulation, updateRegulationLevel } from '@/lib/regulation/detector';
import { analyzeThinkingQuality } from '@/lib/trace/tracker';
import { GuardrailsEngine } from '@/lib/ai/guardrails';
import { buildOptimizedContext } from '@/lib/rag/context-window-manager';
import { createSuggestionReview } from '@/lib/ai/hitl/suggestion-service';
import { z } from 'zod';

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

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: { include: { iepAccommodations: { where: { active: true } } } } },
  });
  if (!user?.student) {
    return new Response(JSON.stringify({ error: 'Student profile not found' }), { status: 404 });
  }

  const session = await db.session.findUnique({
    where: { id: body.sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
  });
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

  // Initialize guardrails engine
  const guardrails = new GuardrailsEngine({
    skipIepCheck: user.student.iepAccommodations.length === 0,
  });

  // Save user message
  const userMessage = await db.message.create({
    data: {
      sessionId: session.id,
      role: 'USER',
      content: body.message,
    },
  });

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

  // Pre-generation guardrail check on user input
  const guardrailContext = {
    sessionPhase: session.currentPhase,
    subject: session.subject,
    gradeLevel: user.student.gradeLevel,
    accommodations: accommodationTypes,
    ragContext: '',
    sessionHistory,
    studentId: user.student.id,
  };

  const preCheck = guardrails.runPreGeneration(body.message, guardrailContext);

  // Log escalation triggers for educator notification
  const escalationViolations = preCheck.violations.filter(
    v => v.details?.requiresEscalation === true,
  );
  if (escalationViolations.length > 0) {
    await db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'ESCALATION_TRIGGER_DETECTED',
        resource: 'Session',
        resourceId: session.id,
        metadata: {
          signals: escalationViolations.map(v => v.message),
          studentId: user.student.id,
        },
      },
    });
  }

  // RAG: Retrieve optimized context (IEP + curriculum + session) via context window manager
  let curriculumContext = '';
  let iepContext = '';
  let ragMetrics = { iepChunks: 0, curriculumChunks: 0, durationMs: 0 };

  try {
    const optimizedContext = await buildOptimizedContext({
      studentId: user.student.id,
      query: preCheck.sanitizedInput || body.message,
      sessionPhase: session.currentPhase,
      subject: session.subject,
      gradeLevel: user.student.gradeLevel,
      accommodations: accommodationTypes,
      sessionHistory,
    });

    curriculumContext = optimizedContext.curriculumContext;
    iepContext = optimizedContext.iepContext;
    ragMetrics = {
      iepChunks: optimizedContext.retrievalMetrics.iepChunksRetrieved,
      curriculumChunks: optimizedContext.retrievalMetrics.curriculumChunksRetrieved,
      durationMs: optimizedContext.retrievalMetrics.retrievalTimeMs,
    };

    console.log(
      `RAG: Retrieved ${ragMetrics.curriculumChunks} curriculum + ${ragMetrics.iepChunks} IEP chunks ` +
      `in ${ragMetrics.durationMs}ms for session ${session.id} ` +
      `(${optimizedContext.totalTokensUsed} tokens used)`,
    );
  } catch (error) {
    console.error(`RAG retrieval error for session ${session.id}:`, error);
  }

  // Update guardrail context with retrieved RAG content for post-generation checks
  guardrailContext.ragContext = [curriculumContext, iepContext].filter(Boolean).join('\n\n');

  // Combine curriculum and IEP context for the topic context
  const combinedTopicContext = [curriculumContext, iepContext].filter(Boolean).join('\n\n');

  const systemPrompt = buildMasterSystemPrompt({
    currentPhase: session.currentPhase,
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
  const apiMessages = session.messages.map(m => ({
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

        // Post-generation guardrail check on AI output
        const postCheck = guardrails.runPostGeneration(fullText, guardrailContext);

        // Use sanitized output if guardrails modified it
        const finalContent = postCheck.sanitizedOutput || fullText;

        // Save assistant message
        await db.message.create({
          data: {
            sessionId: session.id,
            role: 'ASSISTANT',
            content: finalContent,
            metadata: {
              guardrails: {
                passed: postCheck.passed,
                confidenceScore: postCheck.confidenceScore,
                hallucinationScore: postCheck.hallucinationScore,
                fiveRsAlignmentScore: postCheck.fiveRsAlignmentScore,
                violationCount: postCheck.violations.length,
              },
            },
          },
        });

        // If guardrails flagged issues or confidence is low, create HITL review
        if (!postCheck.passed || postCheck.confidenceScore < 0.7) {
          createSuggestionReview({
            tenantId: user.tenantId,
            studentId: user.student!.id,
            sessionId: session.id,
            suggestionType: 'TUTORING_RESPONSE',
            originalContent: finalContent,
            confidenceScore: postCheck.confidenceScore,
            guardrailFlags: {
              passed: postCheck.passed,
              violationCount: postCheck.violations.length,
              violations: postCheck.violations.map(v => ({
                category: v.category,
                severity: v.severity,
                message: v.message,
              })),
            },
            contextSnapshot: {
              phase: session.currentPhase,
              subject: session.subject,
              gradeLevel: user.student!.gradeLevel,
              accommodations: accommodationTypes,
              userMessage: body.message.slice(0, 500),
            },
            priority: postCheck.confidenceScore < 0.5 ? 8 : postCheck.passed ? 2 : 5,
          }).catch(err => {
            console.error('Failed to create HITL review:', err);
          });
        }

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
              console.error('Error tracking TRACE data:', error);
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
}
