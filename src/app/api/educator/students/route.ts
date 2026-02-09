import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError } from '@/lib/api-errors';

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const classId = req.nextUrl.searchParams.get('classId');
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const pageSize = Math.min(parseInt(req.nextUrl.searchParams.get('pageSize') ?? '30', 10), 100);
  const skip = (page - 1) * pageSize;

  if (classId) {
    const targetClass = await db.class.findUnique({
      where: { id: classId },
      select: { tenantId: true },
    });

    if (!targetClass || targetClass.tenantId !== user.tenantId) {
      throw new ForbiddenError();
    }
  }

  const whereClause = {
    user: { tenantId: user.tenantId },
    ...(classId ? { enrollments: { some: { classId } } } : {}),
  };

  const [students, total] = await Promise.all([
    db.student.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        iepAccommodations: { where: { active: true } },
        _count: { select: { sessions: true, progress: true } },
      },
      orderBy: { user: { lastName: 'asc' } },
    }),
    db.student.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: students,
    total,
    page,
    pageSize,
    hasMore: skip + pageSize < total,
  });
});
