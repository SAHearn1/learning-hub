import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { getComplianceMetrics } from '@/lib/evaluation/evaluation.service';

export const GET = withApiHandler(async () => {
  const user = await requireRole([
    'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const metrics = await getComplianceMetrics(user.tenantId);
  return NextResponse.json({ data: metrics });
});
