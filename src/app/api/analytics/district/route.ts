import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireRole(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  // For PLATFORM_ADMIN: allow filtering by tenantId query param; fall back to own tenant.
  // For DISTRICT_ADMIN: always scoped to their own tenant.
  const targetTenantId = user.role === 'PLATFORM_ADMIN'
    ? (req.nextUrl.searchParams.get('tenantId') ?? user.tenantId)
    : user.tenantId;

  const [schools, districtSessions, districtGoals, districtEvals] = await Promise.all([
    db.tenant.findMany({
      where: { id: targetTenantId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    }),
    db.session.count({ where: { tenantId: targetTenantId } }),
    db.iepGoal.count({ where: { tenantId: targetTenantId, status: 'ACTIVE' } }),
    db.evaluationCase.count({ where: { tenantId: targetTenantId, currentState: { not: 'CLOSED' } } }),
  ]);

  return NextResponse.json({
    data: {
      schools,
      district: {
        totalSessions: districtSessions,
        activeIepGoals: districtGoals,
        openEvaluations: districtEvals,
      },
    },
  });
});
