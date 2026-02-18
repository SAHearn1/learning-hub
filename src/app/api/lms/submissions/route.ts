import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';
import { appendImmutableAuditLog } from '@/lib/audit';

const createSubmissionSchema = z.object({
  assignmentId: z.string().min(1),
  content: z.string().max(50000).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
  })).optional(),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

  const assignmentId = req.nextUrl.searchParams.get('assignmentId');
  if (!assignmentId) throw new ValidationError('assignmentId is required');

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { class: true },
  });
  if (!assignment) throw new NotFoundError('Assignment not found');
  if (assignment.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  // Students see only their own submission
  if (user.role === 'STUDENT') {
    if (!user.student) throw new ForbiddenError('Student profile required');
    const submission = await db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.student.id } },
      include: { grade: true },
    });
    return NextResponse.json({ data: submission ? [submission] : [] });
  }

  // Parents see their children's submissions
  if (user.role === 'PARENT') {
    if (!user.parent) throw new ForbiddenError('Parent profile required');
    const submissions = await db.submission.findMany({
      where: {
        assignmentId,
        student: { userId: { in: user.parent.childrenIds } },
      },
      include: { grade: true, student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    return NextResponse.json({ data: submissions });
  }

  // Educators see all submissions for the assignment
  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Access denied');
  }

  const submissions = await db.submission.findMany({
    where: { assignmentId },
    orderBy: { submittedAt: 'desc' },
    include: {
      grade: true,
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json({ data: submissions });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (user.role !== 'STUDENT') {
    throw new ForbiddenError('Only students can submit assignments');
  }
  if (!user.student) throw new ForbiddenError('Student profile required');

  const body = createSubmissionSchema.parse(await req.json());

  const assignment = await db.assignment.findUnique({
    where: { id: body.assignmentId },
    select: { id: true, tenantId: true, published: true, classId: true },
  });
  if (!assignment) throw new NotFoundError('Assignment not found');
  if (assignment.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');
  if (!assignment.published) throw new ForbiddenError('Assignment is not published');

  const enrollment = await db.classEnrollment.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId: user.student.id } },
    select: { status: true },
  });

  if (!enrollment || enrollment.status !== 'ACTIVE') {
    throw new ForbiddenError('You are not enrolled in this class');
  }

  const submission = await db.submission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: body.assignmentId,
        studentId: user.student.id,
      },
    },
    update: {
      content: body.content,
      attachments: (body.attachments as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
    create: {
      tenantId: user.tenantId,
      assignmentId: body.assignmentId,
      studentId: user.student.id,
      content: body.content,
      attachments: (body.attachments as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      status: 'SUBMITTED',
    },
  });

  await appendImmutableAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'SUBMIT_ASSIGNMENT',
    resource: 'Submission',
    resourceId: submission.id,
    metadata: { assignmentId: body.assignmentId },
  });

  return NextResponse.json({ data: submission }, { status: 201 });
});
