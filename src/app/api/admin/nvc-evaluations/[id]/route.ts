import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateNVCEvaluationReview } from '@/lib/nvc/evaluation-service';
import { z } from 'zod';
import type { ReviewStatus, AdminAction } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { NotFoundError, ForbiddenError } from '@/lib/api-errors';

const reviewSchema = z.object({
  reviewStatus: z.enum(['PENDING', 'REVIEWED', 'APPROVED', 'FLAGGED', 'DISMISSED']),
  reviewNotes: z.string().optional(),
  adminAction: z.enum(['NONE', 'REVISED_RESPONSE', 'EDUCATOR_NOTIFIED', 'SYSTEM_IMPROVEMENT', 'FALSE_POSITIVE']).optional(),
});

/**
 * GET /api/admin/nvc-evaluations/[id]
 * Get a specific NVC evaluation by ID
 */
export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN', 'EDUCATOR']);

  const { id } = ctx.params;

  const evaluation = await db.nVCQualityEvaluation.findUnique({
    where: { id },
    include: {
      message: {
        select: {
          id: true,
          content: true,
          role: true,
          createdAt: true,
          sessionId: true,
        },
      },
    },
  });

  if (!evaluation) {
    throw new NotFoundError('Evaluation not found');
  }

  if (evaluation.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  return NextResponse.json({ evaluation });
});

/**
 * PATCH /api/admin/nvc-evaluations/[id]
 * Update review status of an NVC evaluation
 */
export const PATCH = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN', 'EDUCATOR']);

  const { id } = ctx.params;

  const body = reviewSchema.parse(await req.json());

  // Verify the evaluation belongs to the user's tenant
  const evaluation = await db.nVCQualityEvaluation.findUnique({
    where: { id },
  });

  if (!evaluation) {
    throw new NotFoundError('Evaluation not found');
  }

  if (evaluation.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  // Update the evaluation
  const success = await updateNVCEvaluationReview(id, {
    reviewStatus: body.reviewStatus as ReviewStatus,
    reviewedBy: user.id,
    reviewNotes: body.reviewNotes,
    adminAction: body.adminAction as AdminAction | undefined,
  });

  if (!success) {
    throw new Error('Failed to update evaluation');
  }

  // Fetch and return the updated evaluation
  const updatedEvaluation = await db.nVCQualityEvaluation.findUnique({
    where: { id },
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
  });

  return NextResponse.json({ evaluation: updatedEvaluation });
});
