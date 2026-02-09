import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  getPendingNVCEvaluations,
  getFlaggedNVCEvaluations,
  getNVCEvaluationStats,
} from '@/lib/nvc/evaluation-service';

/**
 * GET /api/admin/nvc-evaluations
 * Get NVC quality evaluations for admin review
 * Query params:
 *   - filter: 'pending' | 'flagged' | 'all' (default: 'pending')
 *   - limit: number (default: 50, max: 200)
 */
export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();

  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
  });

  if (!user || !['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN', 'EDUCATOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
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
  } catch (error) {
    console.error('Error fetching NVC evaluations:', error);
    return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
}
