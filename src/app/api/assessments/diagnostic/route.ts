import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDiagnosticQuestions } from '@/lib/assessments/diagnostic-generator';
import { Subject } from '@prisma/client';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { hasRequiredMinorConsent } from '@/lib/compliance';

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
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before diagnostics' }, { status: 403 });
    }

    let body;
    try {
      body = diagnosticSchema.parse(await request.json());
    } catch (err) {
      const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { studentId, sessionId, subject, gradeLevel } = body;

    // Verify session exists and user has access
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { student: { include: { user: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify authorization
    if (user.role === 'STUDENT' && session.student.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
  } catch (error) {
    console.error('Error creating diagnostic assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create diagnostic assessment',
        details: undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assessments/diagnostic
 * Retrieves diagnostic assessments for a student or session
 * 
 * @query studentId or sessionId (required)
 * @returns Array of diagnostic assessments
 * @throws 401 if not authenticated
 * @throws 400 if missing required query params
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before diagnostics' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const sessionId = searchParams.get('sessionId');

    if (!studentId && !sessionId) {
      return NextResponse.json(
        { error: 'Either studentId or sessionId is required' },
        { status: 400 }
      );
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
  } catch (error) {
    console.error('Error fetching diagnostic assessments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch diagnostic assessments',
        details: undefined,
      },
      { status: 500 }
    );
  }
}
