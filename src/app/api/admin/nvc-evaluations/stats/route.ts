import { NextResponse } from 'next/server';
import { getNVCEvaluationStats } from '@/lib/nvc/evaluation-service';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/admin/nvc-evaluations/stats
 * Get NVC evaluation statistics for the tenant
 */
export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN', 'EDUCATOR']);

  const stats = await getNVCEvaluationStats(user.tenantId);
  return NextResponse.json({ stats });
});
