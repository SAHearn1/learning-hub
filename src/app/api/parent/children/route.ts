import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { parent: true },
  });
  if (!user || user.role !== 'PARENT' || !user.parent) {
    return NextResponse.json({ error: 'Parent profile not found' }, { status: 403 });
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
}
