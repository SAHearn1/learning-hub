import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';
import { appendImmutableAuditLog } from '@/lib/audit';

const joinClassSchema = z.object({
  classId: z.string().min(1),
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (user.role !== 'STUDENT') {
    throw new ForbiddenError('Only students can join classes');
  }
  if (!user.student) {
    throw new NotFoundError('Student profile not found');
  }

  const body = joinClassSchema.parse(await req.json());

  const cls = await db.class.findUnique({
    where: { id: body.classId },
    select: { id: true, tenantId: true, name: true },
  });

  if (!cls) {
    throw new NotFoundError('Class not found');
  }
  if (cls.tenantId !== user.tenantId) {
    throw new ForbiddenError('Access denied');
  }

  const enrollment = await db.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId: user.student.id } },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: user.tenantId,
      classId: cls.id,
      studentId: user.student.id,
      status: 'ACTIVE',
    },
  });

  await appendImmutableAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'STUDENT_JOIN_CLASS',
    resource: 'ClassEnrollment',
    resourceId: enrollment.id,
    metadata: { classId: cls.id },
  });

  return NextResponse.json({ data: { enrollmentId: enrollment.id, classId: cls.id, className: cls.name } }, { status: 201 });
});

