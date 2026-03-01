import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { markReportDelivered } from '@/lib/progress-monitoring/progress-monitoring.service';

export const POST = withApiHandler(async (_req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const report = await markReportDelivered(ctx.params.reportId, user.id);
  return NextResponse.json({ data: report });
});
