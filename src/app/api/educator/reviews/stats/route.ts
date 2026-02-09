/**
 * API route for AI Suggestion Review statistics.
 *
 * GET - Returns review statistics for the authenticated educator's tenant:
 *       pending count, approved/rejected today, average review time, approval rate.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/api-errors';
import { getReviewStats } from '@/lib/ai/hitl/suggestion-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'] as const;

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireReviewer() {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    throw new ForbiddenError();
  }

  return user;
}

// ---------------------------------------------------------------------------
// GET - Review statistics
// ---------------------------------------------------------------------------

export const GET = withApiHandler(async () => {
  const user = await requireReviewer();
  const stats = await getReviewStats(user.tenantId);

  return NextResponse.json({ data: stats });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
