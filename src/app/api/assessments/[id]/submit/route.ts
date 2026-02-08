import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generateAIFeedback } from '@/lib/assessments/ai-feedback-generator';
import { updateProgress } from '@/lib/assessments/progress-calculator';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/api-errors';

const submitAssessmentSchema = z.object({
  studentResponse: z.string().min(1),
  timeTaken: z.number().optional(),
});

/**
 * POST /api/assessments/[id]/submit
 * Submits a student's response to an assessment
 *
 * @param id - Assessment ID (via ctx.params.id)
 * @body studentResponse (string), timeTaken (number, optional)
 * @returns Updated assessment with AI-generated feedback
 */
export const POST = withApiHandler(async (req, ctx) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const assessmentId = ctx.params.id;

  const body = submitAssessmentSchema.parse(await req.json());
  const { studentResponse, timeTaken } = body;

  // Get assessment with session and student details
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      session: {
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      },
      standard: true,
    },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Verify the user owns this assessment's session
  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role === 'STUDENT' && assessment.session.student.userId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && assessment.session.student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  // Extract metadata
  const metadata = assessment.metadata as any;

  // Generate AI feedback
  const feedback = await generateAIFeedback({
    question: assessment.question,
    studentResponse,
    correctAnswer: metadata?.correctAnswer,
    rubric: metadata?.rubric,
    bloomsLevel: assessment.bloomsLevel,
    difficulty: assessment.difficulty,
    includeScaffold: true,
  });

  // Update assessment with response and feedback
  const updatedAssessment = await db.assessment.update({
    where: { id: assessmentId },
    data: {
      studentResponse,
      isCorrect: feedback.isCorrect,
      score: feedback.score,
      feedback: feedback.feedback,
      metadata: {
        ...metadata,
        scaffoldHints: feedback.scaffoldHints,
        commonErrors: feedback.commonErrors,
        nextSteps: feedback.nextSteps,
        timeTaken,
      },
    },
  });

  // Update progress if standard is associated
  if (assessment.standardId && assessment.session) {
    await updateProgress({
      studentId: assessment.session.studentId,
      standardId: assessment.standardId,
      tenantId: assessment.session.student.user.tenantId,
      assessmentScore: feedback.score,
      bloomsLevel: assessment.bloomsLevel,
      difficulty: assessment.difficulty,
    });
  }

  return NextResponse.json({
    data: {
      ...updatedAssessment,
      feedback: {
        isCorrect: feedback.isCorrect,
        score: feedback.score,
        feedback: feedback.feedback,
        scaffoldHints: feedback.scaffoldHints,
        nextSteps: feedback.nextSteps,
      },
    },
    message: 'Assessment submitted successfully',
  });
}, { rateLimit: { windowMs: 60_000, max: 30 } });
