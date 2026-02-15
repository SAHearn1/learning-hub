import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError } from '@/lib/api-errors';
import { generateDiagnosticQuestions } from '@/lib/assessments/diagnostic-generator';
import {
  estimateAbilityEAP,
  updateStudentAbility,
  type ResponsePattern,
  type ItemParameters,
} from '@/lib/irt/ability-estimation';
import {
  shouldStopAssessment,
  getRecommendedDifficultyRange,
} from '@/lib/irt/adaptive-selection';

const nextSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * POST /api/explore/pretest/next
 * After the student submits an answer, call this to get the next adaptive question
 * or to finalize the pretest.
 */
export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!user.student) {
    throw new NotFoundError('Student profile not found');
  }

  const body = nextSchema.parse(await req.json());

  // Fetch session and verify ownership
  const session = await db.session.findUnique({
    where: { id: body.sessionId },
    select: {
      id: true,
      studentId: true,
      subject: true,
      metadata: true,
    },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (session.studentId !== user.student.id) {
    throw new ForbiddenError();
  }

  const sessionMeta = session.metadata as Record<string, unknown> | null;
  if (sessionMeta?.type !== 'PRETEST') {
    throw new NotFoundError('Not a pretest session');
  }

  const gradeLevel = (sessionMeta?.gradeLevel as number) || 5;

  // Fetch all answered assessments for this session
  const assessments = await db.assessment.findMany({
    where: {
      sessionId: session.id,
      studentResponse: { not: null },
    },
    orderBy: { createdAt: 'asc' },
  });

  const questionsAnswered = assessments.length;

  // Build response patterns for IRT estimation
  const responses: ResponsePattern[] = assessments.map((a) => {
    // Convert difficulty (1-5 integer) to IRT difficulty scale (-3 to +3)
    const irtDifficulty = ((a.difficulty - 1) / 4) * 6 - 3;
    const params: ItemParameters = {
      difficulty: irtDifficulty,
      discrimination: 1.0,
      guessing: 0,
      model: 'TWO_PL',
    };
    return {
      itemId: a.id,
      isCorrect: a.isCorrect === true,
      parameters: params,
    };
  });

  // Estimate ability
  const estimate = estimateAbilityEAP(responses);

  // Check stopping criterion: target SE=0.3, min 5, max 15 items
  const done = shouldStopAssessment(estimate.standardError, 0.3, 5, 15, questionsAnswered);

  if (done) {
    // Update student ability in database
    await updateStudentAbility(user.student.id, session.subject, estimate);

    // Mark session as completed
    await db.session.update({
      where: { id: session.id },
      data: {
        endedAt: new Date(),
        metadata: {
          ...(sessionMeta as object),
          pretestCompleted: true,
          finalTheta: estimate.theta,
          finalSE: estimate.standardError,
          questionsAnswered,
        },
      },
    });

    return NextResponse.json({
      data: {
        done: true,
        abilityEstimate: estimate,
        questionsAnswered,
      },
    });
  }

  // Generate next question at optimal difficulty
  const { optimal } = getRecommendedDifficultyRange(estimate.theta);
  const targetDifficulty = Math.max(1, Math.min(5, Math.round((optimal + 3) * (4 / 6) + 1)));

  // Pick a standard to link — prefer ones not yet assessed
  const assessedStandardIds = assessments
    .map((a) => a.standardId)
    .filter((id): id is string => id !== null);

  const standard = await db.standard.findFirst({
    where: {
      subject: session.subject,
      ...(assessedStandardIds.length > 0 ? { id: { notIn: assessedStandardIds } } : {}),
    },
    select: { id: true },
  });

  // Generate next question
  const questions = await generateDiagnosticQuestions({
    subject: session.subject,
    gradeLevel,
    difficulty: targetDifficulty,
    count: 1,
  });

  const question = questions[0];
  if (!question) {
    return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
  }

  // Create Assessment record
  const assessment = await db.assessment.create({
    data: {
      sessionId: session.id,
      standardId: standard?.id ?? assessedStandardIds[0] ?? null,
      type: 'DIAGNOSTIC',
      bloomsLevel: question.bloomsLevel,
      difficulty: question.difficulty,
      question: question.question,
      metadata: {
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        rubric: question.rubric,
        scaffoldHints: question.scaffoldHints,
      },
    },
  });

  return NextResponse.json({
    data: {
      done: false,
      assessment,
      abilityEstimate: {
        theta: estimate.theta,
        standardError: estimate.standardError,
      },
      questionsAnswered,
    },
  });
});
