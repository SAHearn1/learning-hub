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
}
