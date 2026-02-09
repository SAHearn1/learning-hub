import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { updateNVCEvaluationReview } from '@/lib/nvc/evaluation-service';
import { z } from 'zod';
import type { ReviewStatus, AdminAction } from '@prisma/client';

const reviewSchema = z.object({
  reviewStatus: z.enum(['PENDING', 'REVIEWED', 'APPROVED', 'FLAGGED', 'DISMISSED']),
  reviewNotes: z.string().optional(),
  adminAction: z.enum(['NONE', 'REVISED_RESPONSE', 'EDUCATOR_NOTIFIED', 'SYSTEM_IMPROVEMENT', 'FALSE_POSITIVE']).optional(),
});

/**
 * GET /api/admin/nvc-evaluations/[id]
 * Get a specific NVC evaluation by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
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
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    if (evaluation.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('Error fetching NVC evaluation:', error);
    return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/nvc-evaluations/[id]
 * Update review status of an NVC evaluation
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const body = reviewSchema.parse(await req.json());

    // Verify the evaluation belongs to the user's tenant
    const evaluation = await db.nVCQualityEvaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    if (evaluation.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the evaluation
    const success = await updateNVCEvaluationReview(id, {
      reviewStatus: body.reviewStatus as ReviewStatus,
      reviewedBy: user.id,
      reviewNotes: body.reviewNotes,
      adminAction: body.adminAction as AdminAction | undefined,
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating NVC evaluation:', error);
    return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 });
  }
}
