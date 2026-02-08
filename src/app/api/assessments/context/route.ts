import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, NotFoundError } from '@/lib/api-errors';

export const GET = withApiHandler(async () => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });

  if (!user?.student) {
    throw new NotFoundError('Student profile not found');
  }

  const latestSession = await db.session.findFirst({
    where: { studentId: user.student.id, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  return NextResponse.json({
    data: {
      studentId: user.student.id,
      gradeLevel: user.student.gradeLevel,
      subject: latestSession?.subject ?? 'MATH',
      sessionId: latestSession?.id ?? null,
    },
  });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
