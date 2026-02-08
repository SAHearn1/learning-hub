import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError } from '@/lib/api-errors';

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
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const pageSize = Math.min(parseInt(req.nextUrl.searchParams.get('pageSize') ?? '30', 10), 100);
  const skip = (page - 1) * pageSize;

  const whereClause = classId
    ? { enrollments: { some: { classId } } }
    : { user: { tenantId: user.tenantId } };

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
}, { rateLimit: { windowMs: 60_000, max: 60 } });
