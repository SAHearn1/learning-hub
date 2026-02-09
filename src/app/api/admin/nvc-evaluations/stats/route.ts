import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getNVCEvaluationStats } from '@/lib/nvc/evaluation-service';

/**
 * GET /api/admin/nvc-evaluations/stats
 * Get NVC evaluation statistics for the tenant
 */
export async function GET() {
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
    const stats = await getNVCEvaluationStats(user.tenantId);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching NVC evaluation stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
