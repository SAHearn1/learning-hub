import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { acknowledgeReport } from '@/lib/progress-monitoring/progress-monitoring.service';

export const POST = withApiHandler(async (_req, ctx) => {
  const user = await requireRole(['PARENT']);

  const report = await acknowledgeReport(ctx.params.reportId, user.id);
  return NextResponse.json({ data: report });
});
