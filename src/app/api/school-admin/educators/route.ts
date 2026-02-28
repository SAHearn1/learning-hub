import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withApiHandler(async (req) => {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);

  const where = { tenantId: user.tenantId, role: 'EDUCATOR' as const };

  const [educators, total] = await Promise.all([
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
        createdAt: true,
        updatedAt: true,
        educator: {
          select: {
            certifications: true,
            specializations: true,
          },
        },
        teachingClasses: {
          where: { tenantId: user.tenantId },
          select: { id: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const data = educators.map((educator) => ({
    id: educator.id,
    firstName: educator.firstName,
    lastName: educator.lastName,
    email: educator.email,
    classCount: educator.teachingClasses.length,
    certifications: educator.educator?.certifications ?? [],
    specializations: educator.educator?.specializations ?? [],
    createdAt: educator.createdAt,
    updatedAt: educator.updatedAt,
  }));

  return NextResponse.json({ data, total, page, limit });
});
