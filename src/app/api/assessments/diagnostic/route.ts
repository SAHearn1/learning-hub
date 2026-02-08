import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generateDiagnosticQuestions } from '@/lib/assessments/diagnostic-generator';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/api-errors';
import { assertMinorConsentForLearning } from '@/lib/compliance';

const diagnosticSchema = z.object({
  studentId: z.string().min(1),
  sessionId: z.string().min(1),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']),
  gradeLevel: z.number().int().min(1).max(12),
  standardIds: z.array(z.string()).optional(),
});

/**
 * POST /api/assessments/diagnostic
 * Generates a diagnostic assessment with AI-generated questions
 *
 * @body studentId, sessionId, subject, gradeLevel, standardIds (optional)
 * @returns Array of created assessment objects
 */
export const POST = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = diagnosticSchema.parse(await req.json());
  const { studentId, sessionId, subject, gradeLevel } = body;

  // Verify session exists and user has access
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { student: { include: { user: true } } },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  assertMinorConsentForLearning(user.isMinor, user.consentStatus, {
    action: 'creating diagnostic assessments',
  });

  // Verify authorization
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError();
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
}, { rateLimit: { windowMs: 60_000, max: 30 } });

/**
 * GET /api/assessments/diagnostic
 * Retrieves diagnostic assessments for a student or session
 *
 * @query studentId or sessionId (required)
 * @returns Array of diagnostic assessments
 */
export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const sessionId = searchParams.get('sessionId');

  if (!studentId && !sessionId) {
    throw new ValidationError('Either studentId or sessionId is required');
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Build query
  const where: any = {
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });
