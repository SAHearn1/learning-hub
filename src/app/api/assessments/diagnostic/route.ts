import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDiagnosticQuestions } from '@/lib/assessments/diagnostic-generator';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-errors';

const diagnosticSchema = z.object({
  studentId: z.string().min(1),
  sessionId: z.string().min(1),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  gradeLevel: z.number().int().min(1).max(12),
  standardIds: z.array(z.string()).optional(),
});

/**
 * POST /api/assessments/diagnostic
 * Generates a diagnostic assessment with AI-generated questions
 *
 * @body studentId, sessionId, subject, gradeLevel, standardIds (optional)
 * @returns Array of created assessment objects
 * @throws 401 if not authenticated
 * @throws 403 if not authorized
 * @throws 400 if invalid input
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before diagnostics');
  }

  const body = diagnosticSchema.parse(await req.json());

  const { sessionId, subject, gradeLevel } = body;

  // Verify session exists and user has access
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { student: { include: { user: true } } },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  // Verify authorization
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    throw new ForbiddenError('Forbidden');
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError('Forbidden');
  }

  // Generate diagnostic questions using AI
  const questions = await generateDiagnosticQuestions({
    subject,
    gradeLevel,
    count: 5,
  });

  // Store assessments in database
  const createdAssessments = [];
  for (const question of questions) {
    const assessment = await db.assessment.create({
      data: {
        sessionId,
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
    createdAssessments.push(assessment);
  }

  return NextResponse.json({
    data: createdAssessments,
    message: 'Diagnostic assessment created successfully',
  });
});

/**
 * GET /api/assessments/diagnostic
 * Retrieves diagnostic assessments for a student or session
 *
 * @query studentId or sessionId (required)
 * @returns Array of diagnostic assessments
 * @throws 401 if not authenticated
 * @throws 400 if missing required query params
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before diagnostics');
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const sessionId = searchParams.get('sessionId');

  if (!studentId && !sessionId) {
    throw new BadRequestError('Either studentId or sessionId is required');
  }

  // Build query
  const where: Record<string, unknown> = {
    type: 'DIAGNOSTIC',
  };

  if (sessionId) {
    where.sessionId = sessionId;
  } else if (studentId) {
    where.session = {
      studentId,
    };
  }

  const assessments = await db.assessment.findMany({
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

  // Verify authorization for each assessment
  const authorizedAssessments = assessments.filter(assessment => {
    if (user.role === 'STUDENT') {
      return assessment.session.student.userId === user.id;
    }
    // Educators and admins can view all in their tenant
    return assessment.session.tenantId === user.tenantId;
  });

  return NextResponse.json({
    data: authorizedAssessments,
  });
});
