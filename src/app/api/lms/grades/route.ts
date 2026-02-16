import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';
import { appendImmutableAuditLog } from '@/lib/audit';

const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(0).default(100),
  feedback: z.string().max(5000).optional(),
  rubricScores: z.record(z.unknown()).optional(),
  letterGrade: z.string().max(5).optional(),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

  const classId = req.nextUrl.searchParams.get('classId');
  const studentId = req.nextUrl.searchParams.get('studentId');

  // Parent viewing child's grades
  if (user.role === 'PARENT') {
    if (!user.parent || !studentId) throw new ForbiddenError('Access denied');
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });
    if (!student || !user.parent.childrenIds.includes(student.userId)) {
      throw new ForbiddenError('Access denied to this student');
    }

    const grades = await db.grade.findMany({
      where: { submission: { studentId, tenantId: user.tenantId } },
      include: {
        submission: {
          include: {
            assignment: { select: { title: true, type: true, points: true, classId: true, dueDate: true } },
          },
        },
      },
      orderBy: { gradedAt: 'desc' },
    });

    return NextResponse.json({ data: grades });
  }

  // Student viewing own grades
  if (user.role === 'STUDENT') {
    if (!user.student) throw new ForbiddenError('Student profile required');
    const where: Record<string, unknown> = {
      submission: { studentId: user.student.id, tenantId: user.tenantId },
    };
    if (classId) {
      where.submission = { ...where.submission as object, assignment: { classId } };
    }

    const grades = await db.grade.findMany({
      where,
      include: {
        submission: {
          include: {
            assignment: { select: { title: true, type: true, points: true, classId: true, dueDate: true } },
          },
        },
      },
      orderBy: { gradedAt: 'desc' },
    });

    return NextResponse.json({ data: grades });
  }

  // Educator viewing grades for a class
  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Access denied');
  }

  if (!classId) throw new ValidationError('classId is required for educator grade view');

  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls || cls.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  const grades = await db.grade.findMany({
    where: { submission: { assignment: { classId }, tenantId: user.tenantId } },
    include: {
      submission: {
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
          assignment: { select: { title: true, type: true, points: true } },
        },
      },
    },
    orderBy: { gradedAt: 'desc' },
  });

  return NextResponse.json({ data: grades });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators can grade submissions');
  }

  const body = gradeSubmissionSchema.parse(await req.json());
  const percentage = body.maxScore > 0 ? (body.score / body.maxScore) * 100 : 0;

  const submission = await db.submission.findUnique({
    where: { id: body.submissionId },
    include: { assignment: true },
  });
  if (!submission) throw new NotFoundError('Submission not found');
  if (submission.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  const grade = await db.grade.upsert({
    where: { submissionId: body.submissionId },
    update: {
      score: body.score,
      maxScore: body.maxScore,
      percentage,
      letterGrade: body.letterGrade ?? computeLetterGrade(percentage),
      feedback: body.feedback,
      rubricScores: (body.rubricScores as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      gradedById: user.id,
      gradedAt: new Date(),
    },
    create: {
      tenantId: user.tenantId,
      submissionId: body.submissionId,
      gradedById: user.id,
      score: body.score,
      maxScore: body.maxScore,
      percentage,
      letterGrade: body.letterGrade ?? computeLetterGrade(percentage),
      feedback: body.feedback,
      rubricScores: (body.rubricScores as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  // Update submission status to GRADED
  await db.submission.update({
    where: { id: body.submissionId },
    data: { status: 'GRADED' },
  });

  await appendImmutableAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'GRADE_SUBMISSION',
    resource: 'Grade',
    resourceId: grade.id,
    metadata: {
      submissionId: body.submissionId,
      assignmentId: submission.assignmentId,
      score: body.score,
      maxScore: body.maxScore,
    },
  });

  return NextResponse.json({ data: grade }, { status: 201 });
});

function computeLetterGrade(percentage: number): string {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}
