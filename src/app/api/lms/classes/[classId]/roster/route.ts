import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators and administrators can view rosters');
  }

  const { classId } = await ctx.params;

  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  const enrollments = await db.classEnrollment.findMany({
    where: { classId, status: 'ACTIVE' },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          progress: { select: { masteryLevel: true, standardId: true } },
          _count: { select: { sessions: true, submissions: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  });

  const roster = enrollments.map((e) => ({
    studentId: e.student.id,
    name: `${e.student.user.firstName} ${e.student.user.lastName}`,
    email: e.student.user.email,
    gradeLevel: e.student.gradeLevel,
    enrolledAt: e.enrolledAt,
    totalSessions: e.student._count.sessions,
    totalSubmissions: e.student._count.submissions,
    averageMastery: e.student.progress.length > 0
      ? Math.round(e.student.progress.reduce((sum, p) => sum + p.masteryLevel, 0) / e.student.progress.length)
      : null,
  }));

  return NextResponse.json({ data: roster, total: roster.length, classId, className: cls.name });
});
