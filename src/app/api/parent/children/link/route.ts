import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';

const linkSchema = z.object({
  studentEmail: z.string().email('A valid student email is required'),
});

const unlinkSchema = z.object({
  studentUserId: z.string().min(1, 'Student user ID is required'),
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PARENT' || !user.parent) {
    throw new ForbiddenError('Parent profile not found');
  }

  const body = linkSchema.parse(await req.json());

  const student = await db.user.findFirst({
    where: { email: body.studentEmail, role: 'STUDENT' },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!student) {
    throw new NotFoundError('No student account found with that email');
  }

  if (user.parent.childrenIds.includes(student.id)) {
    throw new ValidationError('This student is already linked to your account');
  }

  await db.parent.update({
    where: { id: user.parent.id },
    data: {
      childrenIds: { push: student.id },
    },
  });

  return NextResponse.json({
    data: {
      linked: true,
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
    },
  });
}, { rateLimit: { windowMs: 60_000, max: 10 } });

export const DELETE = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PARENT' || !user.parent) {
    throw new ForbiddenError('Parent profile not found');
  }

  const body = unlinkSchema.parse(await req.json());

  if (!user.parent.childrenIds.includes(body.studentUserId)) {
    throw new NotFoundError('Student is not linked to your account');
  }

  const updatedIds = user.parent.childrenIds.filter((id: string) => id !== body.studentUserId);

  await db.parent.update({
    where: { id: user.parent.id },
    data: { childrenIds: updatedIds },
  });

  return NextResponse.json({ data: { unlinked: true } });
});
