import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import {
  checkDisciplineCompliance,
  getDisciplineMetrics,
} from '@/lib/discipline/discipline.service';

export const GET = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const caseId = req.nextUrl.searchParams.get('caseId');

  if (caseId) {
    const result = await checkDisciplineCompliance(user.tenantId, caseId);
    return NextResponse.json({ data: result });
  }

  const metrics = await getDisciplineMetrics(user.tenantId);
  return NextResponse.json({ data: metrics });
});
