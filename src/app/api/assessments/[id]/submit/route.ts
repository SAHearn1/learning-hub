import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateAIFeedback } from '@/lib/assessments/ai-feedback-generator';
import { updateProgress } from '@/lib/assessments/progress-calculator';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const assessmentId = params.id;
    const body = await request.json();
    const { studentResponse } = body;

    // Validate required fields
    if (!studentResponse) {
      return NextResponse.json(
        { error: 'Missing required field: studentResponse' },
        { status: 400 }
      );
    }

    // Get assessment
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        session: {
          include: {
            student: true,
          },
        },
        standard: true,
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
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
        },
      },
    });

    // Update progress if standard is associated
    if (assessment.standardId && assessment.session) {
      await updateProgress({
        studentId: assessment.session.studentId,
        standardId: assessment.standardId,
        assessmentScore: feedback.score,
        bloomsLevel: assessment.bloomsLevel,
        difficulty: assessment.difficulty,
      });
    }

    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
      feedback: {
        isCorrect: feedback.isCorrect,
        score: feedback.score,
        feedback: feedback.feedback,
        scaffoldHints: feedback.scaffoldHints,
        nextSteps: feedback.nextSteps,
      },
      message: 'Assessment submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
