import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

const enrollSchema = z.object({
  studentId: z.string().min(1),
});

export const POST = withApiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) => {
  const { classId } = await params;
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const body = enrollSchema.parse(await req.json());

  const targetClass = await db.class.findUnique({ where: { id: classId } });
  if (!targetClass) {
    throw new NotFoundError('Class not found');
  }

  // Verify the class belongs to the educator's tenant
  if (targetClass.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { tenantId: true } } },
  });
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Verify the student belongs to the same tenant
  if (student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  const enrollment = await db.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId: body.studentId } },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: targetClass.tenantId,
      classId,
      studentId: body.studentId,
    },
  });

  return NextResponse.json({ data: enrollment }, { status: 201 });
});
