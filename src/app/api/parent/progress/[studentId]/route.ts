import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/parent/progress/[studentId]
 * Retrieves a child's progress for a parent user
 *
 * @param studentId - Student ID to view progress for
 * @returns Progress data including standards, reasoning moves, and recent sessions
 * @throws AuthenticationError if not authenticated
 * @throws ForbiddenError if not authorized (must be parent of this student)
 * @throws NotFoundError if student not found
 */
export const GET = withApiHandler(async (req, ctx) => {
  const { studentId } = ctx.params;
  const user = await requireUser();

  if (user.role !== 'PARENT' || !user.parent) {
    throw new ForbiddenError('Parent profile not found');
  }

  // Verify student exists
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Verify student is a child of this parent
  if (!user.parent.childrenIds.includes(student.userId)) {
    throw new ForbiddenError('Not authorized to view this student\'s progress');
  }

  // Get subject filter if provided
  const subject = req.nextUrl.searchParams.get('subject') as string | null;

  // Fetch progress entries
  const progressEntries = await db.progress.findMany({
    where: {
      studentId,
      ...(subject ? { standard: { subject: subject as 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' } } : {}),
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

  // Recent sessions (last 10)
  const recentSessions = await db.session.findMany({
    where: { studentId },
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: {
      _count: {
        select: {
          messages: true,
          assessments: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        gradeLevel: student.gradeLevel,
      },
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
