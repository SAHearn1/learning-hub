import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });

  if (!user?.student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

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
}
