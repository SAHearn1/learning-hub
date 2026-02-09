/**
 * API route for AI Suggestion Review statistics.
 *
 * GET - Returns review statistics for the authenticated educator's tenant:
 *       pending count, approved/rejected today, average review time, approval rate.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError } from '@/lib/api-errors';
import { getReviewStats } from '@/lib/ai/hitl/suggestion-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'] as const;

// ---------------------------------------------------------------------------
// GET - Review statistics
// ---------------------------------------------------------------------------

export const GET = withApiHandler(async () => {
  const user = await requireUser();

  if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    throw new ForbiddenError();
  }

  const stats = await getReviewStats(user.tenantId);

  return NextResponse.json({ data: stats });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
