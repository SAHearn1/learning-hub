import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * GET /api/parent/progress/[studentId]
 * Retrieves a child's progress for a parent user
 * 
 * @param studentId - Student ID to view progress for
 * @returns Progress data including standards, reasoning moves, and recent sessions
 * @throws 401 if not authenticated
 * @throws 403 if not authorized (must be parent of this student)
 * @throws 404 if student or parent not found
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params;
  const { userId: clerkId } = auth();
  
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get parent user
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { parent: true },
  });

  if (!user || user.role !== 'PARENT' || !user.parent) {
    return NextResponse.json({ error: 'Parent profile not found' }, { status: 403 });
  }

  // Verify student is a child of this parent
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (!user.parent.childrenIds.includes(student.userId)) {
    return NextResponse.json({ error: 'Not authorized to view this student\'s progress' }, { status: 403 });
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
          assessments: true 
        } 
      } 
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
}
