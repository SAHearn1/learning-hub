import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { enforceUsageLimits, UsageLimitError } from '@/lib/usage-limits';
import { NotFoundError, ConflictError, PaymentRequiredError, ForbiddenError } from '@/lib/api-errors';
import { generateDiagnosticQuestions } from '@/lib/assessments/diagnostic-generator';
import { getStudentAbility } from '@/lib/irt/ability-estimation';
import { getRecommendedDifficultyRange } from '@/lib/irt/adaptive-selection';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { trackEvent } from '@/lib/monitoring';
import { featureFlags } from '@/lib/feature-flags';

const pretestSchema = z.object({
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  gradeLevel: z.number().int().min(1).max(12),
});

/**
 * POST /api/explore/pretest
 * Creates a pretest session for a subject and returns the first question.
 */
export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (featureFlags.strictRoleEnforcement && user.role !== 'STUDENT') {
    trackEvent('access_denied.non_student_student_endpoint', { endpoint: '/api/explore/pretest', role: user.role });
    throw new ForbiddenError('Only students can start pretests');
  }

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before pretests');
  }

  if (!user.student) {
    throw new NotFoundError('Student profile not found');
  }

  const body = pretestSchema.parse(await req.json());

  // Check if pretest already completed for this subject
  const existingPretest = await db.session.findFirst({
    where: {
      studentId: user.student.id,
      subject: body.subject,
      metadata: {
        path: ['type'],
        equals: 'PRETEST',
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (existingPretest) {
    const meta = existingPretest.metadata as Record<string, unknown> | null;
    if (meta?.pretestCompleted === true) {
      throw new ConflictError('Pretest already completed for this subject');
    }
  }

  // Enforce usage limits
  try {
    await enforceUsageLimits(user.tenantId);
  } catch (error) {
    if (error instanceof UsageLimitError) {
      throw new PaymentRequiredError(error.message);
    }
    throw error;
  }

  // Create pretest session
  const session = await db.session.create({
    data: {
      tenantId: user.tenantId,
      studentId: user.student.id,
      subject: body.subject,
      currentPhase: 'ROOT',
      engagementMode: 'FORWARD',
      regulationState: { level: 70, signals: [], interventionCount: 0 },
      metadata: {
        type: 'PRETEST',
        pretestCompleted: false,
        gradeLevel: body.gradeLevel,
        fiveRState: {
          currentPhase: 'ROOT',
          phaseHistory: [
            {
              phase: 'ROOT',
              timestamp: new Date().toISOString(),
              reason: 'Pretest session initialized.',
            },
          ],
          sentiment: { label: 'neutral', score: 0 },
          regulationPassed: true,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });

  // Get current ability estimate (may be null for first-time students)
  const ability = await getStudentAbility(user.student.id, body.subject);
  const theta = ability?.theta ?? 0;
  const { optimal } = getRecommendedDifficultyRange(theta);

  // Map IRT theta scale (-3 to +3) to difficulty scale (1-5)
  const targetDifficulty = Math.max(1, Math.min(5, Math.round((optimal + 3) * (4 / 6) + 1)));

  // Find a standard for this subject to link the assessment
  const standard = await db.standard.findFirst({
    where: { subject: body.subject },
    select: { id: true },
  });

  // Generate first question
  const questions = await generateDiagnosticQuestions({
    subject: body.subject,
    gradeLevel: body.gradeLevel,
    difficulty: targetDifficulty,
    count: 1,
  });

  const question = questions[0];
  if (!question) {
    // Cleanup session if question generation fails
    await db.session.delete({ where: { id: session.id } });
    return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
  }

  // Create Assessment record
  const assessment = await db.assessment.create({
    data: {
      sessionId: session.id,
      standardId: standard?.id ?? null,
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
      sessionId: session.id,
      assessment,
      abilityEstimate: { theta, standardError: ability?.standardError ?? 1 },
      questionsAnswered: 0,
    },
  }, { status: 201 });
});


