import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withApiHandler(async () => {
  const user = await requireUser();

  if (user.role !== 'PARENT' || !user.parent) {
    throw new ForbiddenError('Parent profile not found');
  }

  if (user.parent.childrenIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const children = await db.student.findMany({
    where: { userId: { in: user.parent.childrenIds } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      progress: {
        include: { standard: { select: { code: true, subject: true, description: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      },
      sessions: {
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          subject: true,
          currentPhase: true,
          startedAt: true,
          endedAt: true,
          _count: { select: { messages: true } },
        },
      },
      _count: { select: { sessions: true, progress: true } },
    },
  });

  return NextResponse.json({ data: children });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
