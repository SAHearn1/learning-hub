import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { generateAIFeedback } from '@/lib/assessments/ai-feedback-generator';
import { updateProgress } from '@/lib/assessments/progress-calculator';
import { suggestPrerequisiteTopics } from '@/lib/curriculum/prerequisite-graph';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

const submitAssessmentSchema = z.object({
  studentResponse: z.string().min(1),
  timeTaken: z.number().optional(),
});

/**
 * POST /api/assessments/[id]/submit
 * Submits a student's response to an assessment.
 */
export const POST = withApiHandler(async (request, ctx) => {
  const assessmentId = ctx.params.id;
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before submitting assessments');
  }

  const { studentResponse, timeTaken } = submitAssessmentSchema.parse(await request.json());

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
      standard: {
        include: {
          topics: {
            include: {
              prerequisites: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  if (user.role === 'STUDENT' && assessment.session.student.userId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && assessment.session.student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  const metadata = (assessment.metadata as Record<string, unknown> | null) ?? {};

  const feedback = await generateAIFeedback({
    question: assessment.question,
    studentResponse,
    correctAnswer: metadata.correctAnswer as string | undefined,
    rubric: metadata.rubric as string | undefined,
    bloomsLevel: assessment.bloomsLevel,
    difficulty: assessment.difficulty,
    includeScaffold: true,
  });

  const prerequisiteRecommendations = feedback.isCorrect
    ? []
    : suggestPrerequisiteTopics(
      assessment.standard?.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        prerequisites: topic.prerequisites,
      })) ?? [],
      assessment.standard?.topics[0]?.name ?? assessment.question,
      3,
    );

  const updatedAssessment = await db.assessment.update({
    where: { id: assessmentId },
    data: {
      studentResponse,
      isCorrect: feedback.isCorrect,
      score: feedback.score,
      feedback: feedback.feedback,
      metadata: JSON.parse(JSON.stringify({
        ...metadata,
        scaffoldHints: feedback.scaffoldHints,
        commonErrors: feedback.commonErrors,
        nextSteps: feedback.nextSteps,
        prerequisiteRecommendations,
        timeTaken,
      })),
    },
  });

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
        prerequisiteRecommendations,
      },
    },
    message: 'Assessment submitted successfully',
  });
});
