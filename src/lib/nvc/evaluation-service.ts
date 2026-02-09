import { db } from '@/lib/db';
import { evaluateNVCCompliance, type NVCEvaluationResult } from './evaluator';
import { AI_MODELS } from '@/lib/ai/client';
import type { ReviewStatus, AdminAction } from '@prisma/client';

export interface CreateNVCEvaluationParams {
  messageId: string;
  sessionId: string;
  tenantId: string;
  assistantResponse: string;
  conversationContext?: string;
}

/**
 * Evaluates a message for NVC compliance and stores the result
 */
export async function createNVCEvaluation(
  params: CreateNVCEvaluationParams
): Promise<string | null> {
  const { messageId, sessionId, tenantId, assistantResponse, conversationContext } = params;

  try {
    // Run LLM evaluation
    const evaluation = await evaluateNVCCompliance(assistantResponse, conversationContext);

    if (!evaluation) {
      console.error('NVC evaluation failed for message:', messageId);
      return null;
    }

    // Store evaluation in database
    const record = await db.nVCQualityEvaluation.create({
      data: {
        messageId,
        sessionId,
        tenantId,
        isCompliant: evaluation.isCompliant,
        nvcScore: evaluation.nvcScore,
        concerns: evaluation.concerns,
        judgmentalPhrases: evaluation.judgmentalPhrases,
        dismissivePhrases: evaluation.dismissivePhrases,
        suggestedRevisions: evaluation.suggestedRevisions,
        rawAnalysis: evaluation.rawAnalysis,
        llmModel: AI_MODELS.lightweight,
        llmTokens: evaluation.llmTokens,
        llmLatencyMs: evaluation.llmLatencyMs,
        reviewStatus: evaluation.isCompliant ? 'APPROVED' : 'PENDING',
      },
    });

    return record.id;
  } catch (error) {
    console.error('Error creating NVC evaluation:', error);
    return null;
  }
}

/**
 * Get pending NVC evaluations for admin review
 */
export async function getPendingNVCEvaluations(
  tenantId: string,
  limit = 50
): Promise<
  Array<{
    id: string;
    messageId: string;
    sessionId: string;
    evaluatedAt: Date;
    isCompliant: boolean;
    nvcScore: number;
    concerns: string[];
    reviewStatus: string;
    message: {
      id: string;
      content: string;
      role: string;
      createdAt: Date;
    };
  }>
> {
  try {
    const evaluations = await db.nVCQualityEvaluation.findMany({
      where: {
        tenantId,
        reviewStatus: 'PENDING',
      },
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
      orderBy: {
        evaluatedAt: 'desc',
      },
      take: limit,
    });

    return evaluations as any;
  } catch (error) {
    console.error('Error fetching pending NVC evaluations:', error);
    return [];
  }
}

/**
 * Get flagged (non-compliant) NVC evaluations
 */
export async function getFlaggedNVCEvaluations(
  tenantId: string,
  limit = 50
): Promise<
  Array<{
    id: string;
    messageId: string;
    sessionId: string;
    evaluatedAt: Date;
    isCompliant: boolean;
    nvcScore: number;
    concerns: string[];
    judgmentalPhrases: string[];
    dismissivePhrases: string[];
    suggestedRevisions: string[];
    reviewStatus: string;
    message: {
      id: string;
      content: string;
      role: string;
      createdAt: Date;
    };
  }>
> {
  try {
    const evaluations = await db.nVCQualityEvaluation.findMany({
      where: {
        tenantId,
        isCompliant: false,
        reviewStatus: {
          in: ['PENDING', 'FLAGGED'],
        },
      },
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
      orderBy: {
        nvcScore: 'asc', // Worst scores first
      },
      take: limit,
    });

    return evaluations as any;
  } catch (error) {
    console.error('Error fetching flagged NVC evaluations:', error);
    return [];
  }
}

/**
 * Update NVC evaluation review status
 */
export async function updateNVCEvaluationReview(
  evaluationId: string,
  reviewData: {
    reviewStatus: ReviewStatus;
    reviewedBy: string;
    reviewNotes?: string;
    adminAction?: AdminAction;
  }
): Promise<boolean> {
  try {
    await db.nVCQualityEvaluation.update({
      where: { id: evaluationId },
      data: {
        reviewStatus: reviewData.reviewStatus,
        reviewedBy: reviewData.reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reviewData.reviewNotes,
        adminAction: reviewData.adminAction,
        actionTakenAt: reviewData.adminAction ? new Date() : null,
      },
    });

    return true;
  } catch (error) {
    console.error('Error updating NVC evaluation review:', error);
    return false;
  }
}

/**
 * Get NVC evaluation statistics for a tenant
 */
export async function getNVCEvaluationStats(tenantId: string): Promise<{
  total: number;
  compliant: number;
  nonCompliant: number;
  averageScore: number;
  pending: number;
  flagged: number;
  reviewed: number;
  topConcerns: Array<{ concern: string; count: number }>;
}> {
  try {
    const [total, compliant, nonCompliant, pending, flagged, reviewed, allEvaluations] =
      await Promise.all([
        // Total count
        db.nVCQualityEvaluation.count({
          where: { tenantId },
        }),
        // Compliant count
        db.nVCQualityEvaluation.count({
          where: { tenantId, isCompliant: true },
        }),
        // Non-compliant count
        db.nVCQualityEvaluation.count({
          where: { tenantId, isCompliant: false },
        }),
        // Pending review count
        db.nVCQualityEvaluation.count({
          where: { tenantId, reviewStatus: 'PENDING' },
        }),
        // Flagged count
        db.nVCQualityEvaluation.count({
          where: { tenantId, reviewStatus: 'FLAGGED' },
        }),
        // Reviewed count
        db.nVCQualityEvaluation.count({
          where: { tenantId, reviewStatus: { in: ['REVIEWED', 'APPROVED', 'DISMISSED'] } },
        }),
        // All evaluations for aggregations
        db.nVCQualityEvaluation.findMany({
          where: { tenantId },
          select: { nvcScore: true, concerns: true },
        }),
      ]);

    // Calculate average score
    const averageScore =
      allEvaluations.length > 0
        ? allEvaluations.reduce((sum, e) => sum + e.nvcScore, 0) / allEvaluations.length
        : 0;

    // Count concerns
    const concernCounts = new Map<string, number>();
    for (const evaluation of allEvaluations) {
      for (const concern of evaluation.concerns) {
        concernCounts.set(concern, (concernCounts.get(concern) || 0) + 1);
      }
    }

    // Get top 5 concerns
    const topConcerns = Array.from(concernCounts.entries())
      .map(([concern, count]) => ({ concern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      compliant,
      nonCompliant,
      averageScore: Math.round(averageScore * 100) / 100,
      pending,
      flagged,
      reviewed,
      topConcerns,
    };
  } catch (error) {
    console.error('Error fetching NVC evaluation stats:', error);
    return {
      total: 0,
      compliant: 0,
      nonCompliant: 0,
      averageScore: 0,
      pending: 0,
      flagged: 0,
      reviewed: 0,
      topConcerns: [],
    };
  }
}
