/**
 * API routes for AI Suggestion Reviews (Human-in-the-Loop).
 *
 * GET  - List pending reviews for the authenticated educator
 * POST - Submit a review decision (approve, approve with edits, reject)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/api-errors';
import {
  getReviewQueue,
  getCompletedReviews,
  submitReview,
  SubmitReviewSchema,
} from '@/lib/ai/hitl/suggestion-service';

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
// GET - List reviews
// ---------------------------------------------------------------------------

export const GET = withApiHandler(async (req) => {
  const user = await requireReviewer();

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const suggestionType = url.searchParams.get('suggestionType') ?? undefined;
  const priority = url.searchParams.get('priority')
    ? parseInt(url.searchParams.get('priority')!, 10)
    : undefined;
  const sortBy = (url.searchParams.get('sortBy') as 'priority' | 'createdAt') ?? 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';
  const status = url.searchParams.get('status') ?? undefined;

  // If requesting completed reviews, use the completed query
  if (status === 'completed') {
    const result = await getCompletedReviews(user.tenantId, page, limit);

    // Enrich reviews with student names
    const studentIds = [...new Set(result.data.map((r) => r.studentId))];
    const students = await db.student.findMany({
      where: { id: { in: studentIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const studentMap = new Map(
      students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`]),
    );

    const enriched = result.data.map((review) => ({
      ...review,
      studentName: studentMap.get(review.studentId) ?? 'Unknown Student',
    }));

    return NextResponse.json({ ...result, data: enriched });
  }

  // Default: pending reviews
  const filters = {
    suggestionType: suggestionType as
      | 'TUTORING_RESPONSE'
      | 'IEP_RECOMMENDATION'
      | 'ASSESSMENT_FEEDBACK'
      | 'ACCOMMODATION_SUGGESTION'
      | 'PROGRESS_NOTE'
      | undefined,
    priority,
    page,
    limit,
    sortBy,
    sortOrder,
  };

  const result = await getReviewQueue(user.tenantId, filters);

  // Enrich reviews with student names
  const studentIds = [...new Set(result.data.map((r) => r.studentId))];
  const students = await db.student.findMany({
    where: { id: { in: studentIds } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  const studentMap = new Map(
    students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`]),
  );

  const enriched = result.data.map((review) => ({
    ...review,
    studentName: studentMap.get(review.studentId) ?? 'Unknown Student',
  }));

  return NextResponse.json({ ...result, data: enriched });
}, { rateLimit: { windowMs: 60_000, max: 60 } });

// ---------------------------------------------------------------------------
// POST - Submit review decision
// ---------------------------------------------------------------------------

const PostBodySchema = z.object({
  reviewId: z.string().min(1),
  decision: z.enum(['approved', 'approved_with_edits', 'rejected']),
  editedContent: z.string().optional(),
  notes: z.string().optional(),
});

export const POST = withApiHandler(async (req) => {
  const user = await requireReviewer();
  const body = PostBodySchema.parse(await req.json());

  // Verify the review exists and belongs to the same tenant
  const existing = await db.aiSuggestionReview.findUnique({
    where: { id: body.reviewId },
  });

  if (!existing) {
    throw new NotFoundError('Review not found');
  }

  if (existing.tenantId !== user.tenantId) {
    throw new ForbiddenError('Review does not belong to your organization');
  }

  if (existing.reviewStatus !== 'PENDING_REVIEW') {
    throw new ValidationError('This review has already been processed');
  }

  // Validate decision-specific requirements
  if (body.decision === 'approved_with_edits' && !body.editedContent) {
    throw new ValidationError('Edited content is required when approving with edits');
  }

  if (body.decision === 'rejected' && !body.notes) {
    throw new ValidationError('Notes are required when rejecting a suggestion');
  }

  // Submit the review
  const updated = await submitReview(
    body.reviewId,
    user.id,
    body.decision,
    body.editedContent,
    body.notes,
  );

  // Create audit log entry
  await db.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: `REVIEW_${body.decision.toUpperCase()}`,
      resource: 'AiSuggestionReview',
      resourceId: body.reviewId,
      metadata: {
        suggestionType: existing.suggestionType,
        studentId: existing.studentId,
        decision: body.decision,
        hasEdits: !!body.editedContent,
        hasNotes: !!body.notes,
      },
    },
  });

  return NextResponse.json({
    data: updated,
    message: 'Review submitted successfully',
  });
}, { rateLimit: { windowMs: 60_000, max: 30 } });
