import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { withApiHandler } from '@/lib/api-handler';
import { NotFoundError } from '@/lib/api-errors';

export const GET = withApiHandler(async () => {
  const user = await requireUser();

  if (!user.student) {
    throw new NotFoundError('Student profile not found');
  }

  const { db } = await import('@/lib/db');
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
