import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get('classId');
  const studentId = req.nextUrl.searchParams.get('studentId');

  // Class-level report
  if (classId) {
    const enrollments = await db.classEnrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            progress: { include: { standard: true } },
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: { startedAt: true, endedAt: true, currentPhase: true },
            },
            _count: { select: { sessions: true } },
          },
        },
      },
    });

    const report = enrollments.map(e => {
      const totalMastery = e.student.progress.length > 0
        ? e.student.progress.reduce((sum, p) => sum + p.masteryLevel, 0) / e.student.progress.length
        : 0;

      return {
        studentId: e.student.id,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        gradeLevel: e.student.gradeLevel,
        averageMastery: Math.round(totalMastery * 10) / 10,
        standardsTracked: e.student.progress.length,
        totalSessions: e.student._count.sessions,
        lastSession: e.student.sessions[0] ?? null,
      };
    });

    return NextResponse.json({ data: report });
  }

  // Individual student report
  if (studentId) {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        progress: { include: { standard: true }, orderBy: { updatedAt: 'desc' } },
        iepAccommodations: { where: { active: true } },
        thinkingProgress: { orderBy: { proficiencyLevel: 'desc' } },
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 20,
          include: { _count: { select: { messages: true, assessments: true } } },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ data: student });
  }

  return NextResponse.json({ error: 'Provide classId or studentId' }, { status: 400 });
}
