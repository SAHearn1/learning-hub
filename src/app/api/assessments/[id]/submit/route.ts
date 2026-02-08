import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generateAIFeedback } from '@/lib/assessments/ai-feedback-generator';
import { updateProgress } from '@/lib/assessments/progress-calculator';
import { z } from 'zod';

const submitAssessmentSchema = z.object({
  studentResponse: z.string().min(1),
  timeTaken: z.number().optional(),
});

/**
 * POST /api/assessments/[id]/submit
 * Submits a student's response to an assessment
 * 
 * @param id - Assessment ID
 * @body studentResponse (string), timeTaken (number, optional)
 * @returns Updated assessment with AI-generated feedback
 * @throws 401 if not authenticated
 * @throws 403 if not authorized (must be session owner)
 * @throws 404 if assessment not found
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const assessmentId = params.id;

    let body;
    try {
      body = submitAssessmentSchema.parse(await request.json());
    } catch (err) {
      const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
      return NextResponse.json({ error: message }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Verify the user owns this assessment's session
    const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'STUDENT' && assessment.session.student.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (user.role !== 'STUDENT' && assessment.session.student.user.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 }
    );
  }
}
