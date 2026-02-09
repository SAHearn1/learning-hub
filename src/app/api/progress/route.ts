import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Students see their own progress; educators/admins can specify a studentId
  let studentId: string | null = null;
  const queriedStudentId = req.nextUrl.searchParams.get('studentId');

  if (user.role === 'STUDENT') {
    if (!user.student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }
    studentId = user.student.id;
  } else if (queriedStudentId) {
    // Verify the queried student belongs to the same tenant
    const queriedStudent = await db.student.findUnique({
      where: { id: queriedStudentId },
      include: { user: { select: { tenantId: true } } },
    });
    if (!queriedStudent || queriedStudent.user.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    studentId = queriedStudentId;
  } else {
    return NextResponse.json({ error: 'studentId required for non-student roles' }, { status: 400 });
  }

  const subject = req.nextUrl.searchParams.get('subject') as string | null;

  const progressEntries = await db.progress.findMany({
    where: {
      studentId,
      ...(subject ? { standard: { subject: subject as 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY' } } : {}),
    },
    include: { standard: true },
    orderBy: { updatedAt: 'desc' },
  });

  // Compute summary statistics
  const totalStandards = progressEntries.length;
  const averageMastery = totalStandards > 0
    ? progressEntries.reduce((sum, p) => sum + p.masteryLevel, 0) / totalStandards
    : 0;
  const masteredCount = progressEntries.filter(p => p.masteryLevel >= 80).length;
  const inProgressCount = progressEntries.filter(p => p.masteryLevel > 0 && p.masteryLevel < 80).length;

  // Reasoning move progress
  const reasoningMoves = await db.reasoningMoveProgress.findMany({
    where: { studentId },
    orderBy: { proficiencyLevel: 'desc' },
  });

  // Recent sessions
  const recentSessions = await db.session.findMany({
    where: { studentId },
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: { _count: { select: { messages: true, assessments: true } } },
  });

  return NextResponse.json({
    data: {
      summary: {
        totalStandards,
        averageMastery: Math.round(averageMastery * 10) / 10,
        masteredCount,
        inProgressCount,
        totalSessions: recentSessions.length,
      },
      standards: progressEntries,
      reasoningMoves,
      recentSessions,
    },
  });
}
