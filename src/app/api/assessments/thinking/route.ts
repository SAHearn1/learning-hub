import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateThinkingQuality, generateThinkingPrompt } from '@/lib/assessments/thinking-evaluator';
import { trackReasoningMove } from '@/lib/assessments/reasoning-move-tracker';
import { EngagementMode, ReasoningMove } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { BadRequestError } from '@/lib/api-errors';
import { z } from 'zod';

const generatePromptSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  problemContext: z.string().min(1, 'problemContext is required'),
  engagementMode: z.nativeEnum(EngagementMode).optional().default('FORWARD'),
  targetReasoningMoves: z.array(z.nativeEnum(ReasoningMove)).optional(),
});

export const POST = withApiHandler(async (req) => {
  await requireUser();

  const body = generatePromptSchema.parse(await req.json());

  // Generate thinking prompt
  const prompt = await generateThinkingPrompt(
    body.engagementMode,
    body.problemContext,
    body.targetReasoningMoves
  );

  return NextResponse.json({
    success: true,
    prompt,
    mode: body.engagementMode,
    message: 'Thinking assessment prompt generated',
  });
});

const evaluateResponseSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  studentResponse: z.string().min(1, 'studentResponse is required'),
  problemContext: z.string().min(1, 'problemContext is required'),
  engagementMode: z.nativeEnum(EngagementMode).optional().default('FORWARD'),
});

export const PUT = withApiHandler(async (req) => {
  await requireUser();

  const body = evaluateResponseSchema.parse(await req.json());

  // Get session info
  const session = await db.session.findUnique({
    where: { id: body.sessionId },
    include: {
      student: true,
    },
  });

  if (!session) {
    throw new BadRequestError('Session not found');
  }

  // Evaluate thinking quality using AI
  const evaluation = await evaluateThinkingQuality(
    body.studentResponse,
    body.problemContext,
    body.engagementMode
  );

  // Create thinking assessment record
  const thinkingAssessment = await db.thinkingAssessment.create({
    data: {
      sessionId: body.sessionId,
      assessmentType: 'INTEGRATED',
      reasoningArticulation: evaluation.thinkingQuality.reasoningArticulation,
      assumptionAwareness: evaluation.thinkingQuality.assumptionAwareness,
      evidenceEvaluation: evaluation.thinkingQuality.evidenceEvaluation,
      alternativePerspectives: evaluation.thinkingQuality.alternativePerspectives,
      conclusionJustification: evaluation.thinkingQuality.conclusionJustification,
      metacognitiveAwareness: evaluation.thinkingQuality.metacognitiveAwareness,
      fluency: evaluation.creativity.fluency,
      flexibility: evaluation.creativity.flexibility,
      originality: evaluation.creativity.originality,
      elaboration: evaluation.creativity.elaboration,
      riskTaking: evaluation.creativity.riskTaking,
      modeUsed: body.engagementMode,
      reasoningMovesUsed: evaluation.reasoningMovesUsed,
      rawResponse: body.studentResponse,
      aiAnalysis: evaluation.aiAnalysis,
      traceProtocolEvidence: {
        strengths: evaluation.strengths,
        areasForGrowth: evaluation.areasForGrowth,
      },
    },
  });

  // Track reasoning moves used
  for (const move of evaluation.reasoningMovesUsed) {
    await trackReasoningMove({
      studentId: session.student.id,
      move,
      wasPrompted: false, // Assume spontaneous in this context
    });
  }

  return NextResponse.json({
    success: true,
    assessment: thinkingAssessment,
    evaluation,
    message: 'Thinking assessment evaluated successfully',
  });
});

const querySchema = z.object({
  sessionId: z.string().optional(),
  studentId: z.string().optional(),
}).refine(
  (data) => data.sessionId || data.studentId,
  { message: 'Either sessionId or studentId is required' }
);

export const GET = withApiHandler(async (req) => {
  await requireUser();

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const params = querySchema.parse(searchParams);

  // Build query
  const where: any = {};

  if (params.sessionId) {
    where.sessionId = params.sessionId;
  } else if (params.studentId) {
    where.session = {
      studentId: params.studentId,
    };
  }

  const assessments = await db.thinkingAssessment.findMany({
    where,
    include: {
      session: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({
    success: true,
    assessments,
  });
});
