import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';

export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const classId = req.nextUrl.searchParams.get('classId');
  const studentId = req.nextUrl.searchParams.get('studentId');

  // Class-level report
  if (classId) {
    // Verify the class belongs to the educator's tenant
    const targetClass = await db.class.findUnique({ where: { id: classId } });
    if (!targetClass || targetClass.tenantId !== user.tenantId) {
      throw new ForbiddenError();
    }

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
        user: { select: { firstName: true, lastName: true, email: true, tenantId: true } },
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
      throw new NotFoundError('Student not found');
    }

    if (student.user.tenantId !== user.tenantId) {
      throw new ForbiddenError();
    }

    return NextResponse.json({ data: student });
  }

  throw new ValidationError('Provide classId or studentId');
}, { rateLimit: { windowMs: 60_000, max: 60 } });
