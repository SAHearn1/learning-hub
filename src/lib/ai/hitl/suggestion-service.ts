/**
 * Human-in-the-Loop Suggestion Review Service
 *
 * Manages the lifecycle of AI-generated suggestions that require educator
 * approval before becoming official student records. Provides functions for
 * creating, querying, reviewing, and maintaining suggestion reviews.
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const SuggestionTypeSchema = z.enum([
  'TUTORING_RESPONSE',
  'IEP_RECOMMENDATION',
  'ASSESSMENT_FEEDBACK',
  'ACCOMMODATION_SUGGESTION',
  'PROGRESS_NOTE',
]);

export const ReviewStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'APPROVED_WITH_EDITS',
  'REJECTED',
  'EXPIRED',
]);

export const ReviewDecisionSchema = z.enum([
  'approved',
  'approved_with_edits',
  'rejected',
]);

export const CreateSuggestionReviewSchema = z.object({
  tenantId: z.string().min(1),
  studentId: z.string().min(1),
  sessionId: z.string().optional(),
  suggestionType: SuggestionTypeSchema,
  originalContent: z.string().min(1),
  confidenceScore: z.number().min(0).max(1).optional(),
  guardrailFlags: z.record(z.unknown()).optional(),
  contextSnapshot: z.record(z.unknown()).optional(),
  priority: z.number().int().min(0).max(10).default(0),
  expiresAt: z.date().optional(),
});

export const SubmitReviewSchema = z.object({
  reviewId: z.string().min(1),
  decision: ReviewDecisionSchema,
  editedContent: z.string().optional(),
  notes: z.string().optional(),
});

export const ReviewQueueFiltersSchema = z.object({
  suggestionType: SuggestionTypeSchema.optional(),
  priority: z.number().int().optional(),
  status: ReviewStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['priority', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateSuggestionReviewInput = z.input<typeof CreateSuggestionReviewSchema>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type ReviewQueueFilters = z.input<typeof ReviewQueueFiltersSchema>;

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Creates a new AI suggestion review in PENDING_REVIEW status.
 * Called when the AI generates a suggestion that requires educator approval.
 */
export async function createSuggestionReview(params: CreateSuggestionReviewInput) {
  const validated = CreateSuggestionReviewSchema.parse(params);

  const review = await db.aiSuggestionReview.create({
    data: {
      tenantId: validated.tenantId,
      studentId: validated.studentId,
      sessionId: validated.sessionId,
      suggestionType: validated.suggestionType,
      originalContent: validated.originalContent,
      confidenceScore: validated.confidenceScore,
      guardrailFlags: validated.guardrailFlags !== undefined ? (validated.guardrailFlags as Prisma.InputJsonValue) : undefined,
      contextSnapshot: validated.contextSnapshot !== undefined ? (validated.contextSnapshot as Prisma.InputJsonValue) : undefined,
      priority: validated.priority,
      expiresAt: validated.expiresAt,
    },
  });

  return review;
}

/**
 * Retrieves the review queue for an educator, filtered by tenant.
 * Supports pagination, type filtering, priority filtering, and sorting.
 */
export async function getReviewQueue(tenantId: string, filters: ReviewQueueFilters) {
  const validated = ReviewQueueFiltersSchema.parse(filters);
  const skip = (validated.page - 1) * validated.limit;

  const where: Record<string, unknown> = {
    tenantId,
    reviewStatus: validated.status ?? 'PENDING_REVIEW',
  };

  if (validated.suggestionType) {
    where.suggestionType = validated.suggestionType;
  }

  if (validated.priority !== undefined) {
    where.priority = { gte: validated.priority };
  }

  const orderBy =
    validated.sortBy === 'priority'
      ? [{ priority: validated.sortOrder as 'asc' | 'desc' }, { createdAt: 'desc' as const }]
      : [{ createdAt: validated.sortOrder as 'asc' | 'desc' }];

  const [reviews, total] = await Promise.all([
    db.aiSuggestionReview.findMany({
      where,
      skip,
      take: validated.limit,
      orderBy,
    }),
    db.aiSuggestionReview.count({ where }),
  ]);

  return {
    data: reviews,
    total,
    page: validated.page,
    limit: validated.limit,
    hasMore: skip + validated.limit < total,
  };
}

/**
 * Retrieves completed reviews for a tenant (approved, rejected, etc.).
 */
export async function getCompletedReviews(
  tenantId: string,
  page: number = 1,
  limit: number = 20,
) {
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    reviewStatus: { in: ['APPROVED', 'APPROVED_WITH_EDITS', 'REJECTED', 'EXPIRED'] as ('APPROVED' | 'APPROVED_WITH_EDITS' | 'REJECTED' | 'EXPIRED')[] },
  };

  const [reviews, total] = await Promise.all([
    db.aiSuggestionReview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { reviewedAt: 'desc' },
    }),
    db.aiSuggestionReview.count({ where }),
  ]);

  return {
    data: reviews,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
  };
}

/**
 * Submits an educator's review decision for an AI suggestion.
 * Maps the decision string to the appropriate ReviewStatus enum value.
 */
export async function submitReview(
  reviewId: string,
  reviewerId: string,
  decision: 'approved' | 'approved_with_edits' | 'rejected',
  editedContent?: string,
  notes?: string,
) {
  const statusMap = {
    approved: 'APPROVED',
    approved_with_edits: 'APPROVED_WITH_EDITS',
    rejected: 'REJECTED',
  } as const;

  const reviewStatus = statusMap[decision];

  // Require edited content for approved_with_edits
  if (decision === 'approved_with_edits' && !editedContent) {
    throw new Error('Edited content is required when approving with edits');
  }

  // Require notes for rejected items
  if (decision === 'rejected' && !notes) {
    throw new Error('Notes are required when rejecting a suggestion');
  }

  const updated = await db.aiSuggestionReview.update({
    where: { id: reviewId },
    data: {
      reviewStatus,
      reviewerId,
      editedContent: editedContent ?? undefined,
      reviewerNotes: notes ?? undefined,
      reviewedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Retrieves review statistics for a tenant.
 * Includes counts by status, today's activity, and average review time.
 */
export async function getReviewStats(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    pendingCount,
    approvedToday,
    rejectedToday,
    allReviewedToday,
    totalReviewed,
  ] = await Promise.all([
    db.aiSuggestionReview.count({
      where: { tenantId, reviewStatus: 'PENDING_REVIEW' },
    }),
    db.aiSuggestionReview.count({
      where: {
        tenantId,
        reviewStatus: { in: ['APPROVED', 'APPROVED_WITH_EDITS'] },
        reviewedAt: { gte: today },
      },
    }),
    db.aiSuggestionReview.count({
      where: {
        tenantId,
        reviewStatus: 'REJECTED',
        reviewedAt: { gte: today },
      },
    }),
    db.aiSuggestionReview.findMany({
      where: {
        tenantId,
        reviewedAt: { gte: today },
      },
      select: { createdAt: true, reviewedAt: true },
    }),
    db.aiSuggestionReview.count({
      where: {
        tenantId,
        reviewStatus: { not: 'PENDING_REVIEW' },
      },
    }),
  ]);

  // Calculate average review time in minutes
  let avgReviewTimeMinutes = 0;
  if (allReviewedToday.length > 0) {
    const totalMs = allReviewedToday.reduce((sum: number, review: any) => {
      if (review.reviewedAt) {
        return sum + (review.reviewedAt.getTime() - review.createdAt.getTime());
      }
      return sum;
    }, 0);
    avgReviewTimeMinutes = Math.round(totalMs / allReviewedToday.length / 60000);
  }

  // Calculate approval rate
  const totalDecisions = approvedToday + rejectedToday;
  const approvalRate = totalDecisions > 0 ? Math.round((approvedToday / totalDecisions) * 100) : 0;

  return {
    pendingCount,
    approvedToday,
    rejectedToday,
    reviewedToday: allReviewedToday.length,
    totalReviewed,
    avgReviewTimeMinutes,
    approvalRate,
  };
}

/**
 * Marks stale reviews as EXPIRED based on their expiresAt timestamp.
 * Should be called periodically (e.g., via cron job).
 */
export async function expireStaleReviews() {
  const now = new Date();

  const result = await db.aiSuggestionReview.updateMany({
    where: {
      reviewStatus: 'PENDING_REVIEW',
      expiresAt: { lte: now },
    },
    data: {
      reviewStatus: 'EXPIRED',
    },
  });

  return { expiredCount: result.count };
}
