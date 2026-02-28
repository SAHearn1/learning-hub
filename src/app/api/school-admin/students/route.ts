import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withApiHandler(async (req) => {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);

  const where = { tenantId: user.tenantId, role: 'STUDENT' as const };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { lastName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        consentStatus: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            gradeLevel: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { classId: true },
            },
            iepAccommodations: {
              where: { active: true },
              select: { id: true },
            },
            progress: {
              select: { masteryLevel: true },
            },
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const data = students.map((user) => {
    const progressEntries = user.student?.progress ?? [];
    const averageMastery =
      progressEntries.length > 0
        ? Math.round(
            (progressEntries.reduce((sum, p) => sum + p.masteryLevel, 0) /
              progressEntries.length) *
              10,
          ) / 10
        : 0;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      consentStatus: user.consentStatus,
      gradeLevel: user.student?.gradeLevel ?? null,
      classCount: user.student?.enrollments.length ?? 0,
      iepAccommodationCount: user.student?.iepAccommodations.length ?? 0,
      averageMastery,
      createdAt: user.createdAt,
    };
  });

  return NextResponse.json({ data, total, page, limit });
});
