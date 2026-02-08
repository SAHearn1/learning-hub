import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError, NotFoundError } from '@/lib/api-errors';

const enrollSchema = z.object({
  studentId: z.string().min(1),
});

export const POST = withApiHandler(async (req, ctx) => {
  const { classId } = ctx.params;
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN'].includes(user.role)) {
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
}, { rateLimit: { windowMs: 60_000, max: 30 } });
