import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { evaluateThinkingQuality, generateThinkingPrompt } from '@/lib/assessments/thinking-evaluator';
import { trackReasoningMove } from '@/lib/assessments/reasoning-move-tracker';
import { EngagementMode, ReasoningMove } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@/lib/api-errors';

export const POST = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = await req.json();
  const { sessionId, problemContext, engagementMode, targetReasoningMoves } = body;

  // Validate required fields
  if (!sessionId || !problemContext) {
    throw new ValidationError('Missing required fields: sessionId, problemContext');
  }

  // Validate engagement mode
  const mode: EngagementMode = engagementMode || 'FORWARD';
  if (!Object.values(EngagementMode).includes(mode)) {
    throw new ValidationError(`Invalid engagement mode. Must be one of: ${Object.values(EngagementMode).join(', ')}`);
  }

  // Generate thinking prompt
  const prompt = await generateThinkingPrompt(mode, problemContext, targetReasoningMoves);

  return NextResponse.json({
    success: true,
    prompt,
    mode,
    message: 'Thinking assessment prompt generated',
  });
}, { rateLimit: { windowMs: 60_000, max: 30 } });

export const PUT = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = await req.json();
  const { sessionId, studentResponse, problemContext, engagementMode } = body;

  // Validate required fields
  if (!sessionId || !studentResponse || !problemContext) {
    throw new ValidationError('Missing required fields: sessionId, studentResponse, problemContext');
  }

  // Get session info
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      student: true,
    },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  // Validate engagement mode
  const mode: EngagementMode = engagementMode || 'FORWARD';

  // Evaluate thinking quality using AI
  const evaluation = await evaluateThinkingQuality(studentResponse, problemContext, mode);

  // Create thinking assessment record
  const thinkingAssessment = await db.thinkingAssessment.create({
    data: {
      sessionId,
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
      modeUsed: mode,
      reasoningMovesUsed: evaluation.reasoningMovesUsed,
      rawResponse: studentResponse,
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
}, { rateLimit: { windowMs: 60_000, max: 30 } });

export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const studentId = searchParams.get('studentId');

  if (!sessionId && !studentId) {
    throw new ValidationError('Either sessionId or studentId is required');
  }

  // Build query
  const where: any = {};

  if (sessionId) {
    where.sessionId = sessionId;
  } else if (studentId) {
    where.session = {
      studentId,
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });
