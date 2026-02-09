import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError, BadRequestError } from '@/lib/api-errors';
import { db } from '@/lib/db';

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  // Students see their own progress; educators/admins can specify a studentId
  let studentId: string | null = null;
  const queriedStudentId = req.nextUrl.searchParams.get('studentId');

  if (user.role === 'STUDENT') {
    if (!user.student) {
      throw new NotFoundError('Student profile not found');
    }
    studentId = user.student.id;
  } else if (queriedStudentId) {
    // Verify the queried student belongs to the same tenant
    const queriedStudent = await db.student.findUnique({
      where: { id: queriedStudentId },
      include: { user: { select: { tenantId: true } } },
    });
    if (!queriedStudent || queriedStudent.user.tenantId !== user.tenantId) {
      throw new ForbiddenError('Forbidden');
    }
    studentId = queriedStudentId;
  } else {
    throw new BadRequestError('studentId required for non-student roles');
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });
