import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getPendingNVCEvaluations,
  getFlaggedNVCEvaluations,
} from '@/lib/nvc/evaluation-service';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/admin/nvc-evaluations
 * Get NVC quality evaluations for admin review
 * Query params:
 *   - filter: 'pending' | 'flagged' | 'all' (default: 'pending')
 *   - limit: number (default: 50, max: 200)
 */
export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN', 'EDUCATOR']);

  const searchParams = req.nextUrl.searchParams;
  const filter = searchParams.get('filter') || 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  let evaluations;

  if (filter === 'pending') {
    evaluations = await getPendingNVCEvaluations(user.tenantId, limit);
  } else if (filter === 'flagged') {
    evaluations = await getFlaggedNVCEvaluations(user.tenantId, limit);
  } else {
    // Get all evaluations
    evaluations = await db.nVCQualityEvaluation.findMany({
      where: { tenantId: user.tenantId },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { evaluatedAt: 'desc' },
      take: limit,
    });
  }

  return NextResponse.json({ evaluations });
});
