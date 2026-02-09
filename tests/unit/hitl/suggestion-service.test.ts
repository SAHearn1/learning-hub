import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateSuggestionReviewSchema,
  SubmitReviewSchema,
  ReviewQueueFiltersSchema,
  SuggestionTypeSchema,
  ReviewStatusSchema,
  ReviewDecisionSchema,
  createSuggestionReview,
  submitReview,
  getReviewQueue,
  getReviewStats,
  expireStaleReviews,
} from '@/lib/ai/hitl/suggestion-service';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  db: {
    aiSuggestionReview: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HITL Suggestion Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Zod Schema Validations
  // -----------------------------------------------------------------------
  describe('CreateSuggestionReviewSchema validation', () => {
    it('should validate a correct createSuggestionReview input', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'AI suggested this response for the student.',
        confidenceScore: 0.85,
        priority: 5,
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty tenantId', () => {
      const input = {
        tenantId: '',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty studentId', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: '',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty originalContent', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: '',
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid suggestionType', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'INVALID_TYPE',
        originalContent: 'Some content.',
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject confidenceScore outside 0-1 range', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
        confidenceScore: 1.5,
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative confidenceScore', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
        confidenceScore: -0.1,
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject priority outside 0-10 range', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
        priority: 15,
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept all valid suggestion types', () => {
      const types = [
        'TUTORING_RESPONSE',
        'IEP_RECOMMENDATION',
        'ASSESSMENT_FEEDBACK',
        'ACCOMMODATION_SUGGESTION',
        'PROGRESS_NOTE',
      ] as const;

      for (const type of types) {
        const input = {
          tenantId: 'tenant-001',
          studentId: 'student-001',
          suggestionType: type,
          originalContent: 'Some content.',
        };

        const result = CreateSuggestionReviewSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should default priority to 0 when not provided', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
      };

      const result = CreateSuggestionReviewSchema.parse(input);
      expect(result.priority).toBe(0);
    });

    it('should accept optional fields (sessionId, guardrailFlags, contextSnapshot, expiresAt)', () => {
      const input = {
        tenantId: 'tenant-001',
        studentId: 'student-001',
        sessionId: 'session-123',
        suggestionType: 'TUTORING_RESPONSE' as const,
        originalContent: 'Some content.',
        guardrailFlags: { piiDetected: false },
        contextSnapshot: { phase: 'REFLECT' },
        expiresAt: new Date('2026-12-31'),
      };

      const result = CreateSuggestionReviewSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // SubmitReview schema validation
  // -----------------------------------------------------------------------
  describe('SubmitReviewSchema validation', () => {
    it('should validate a correct submit review input', () => {
      const input = {
        reviewId: 'review-001',
        decision: 'approved' as const,
      };

      const result = SubmitReviewSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty reviewId', () => {
      const input = {
        reviewId: '',
        decision: 'approved' as const,
      };

      const result = SubmitReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid decision', () => {
      const input = {
        reviewId: 'review-001',
        decision: 'maybe',
      };

      const result = SubmitReviewSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept all valid decisions', () => {
      const decisions = ['approved', 'approved_with_edits', 'rejected'] as const;

      for (const decision of decisions) {
        const input = { reviewId: 'review-001', decision };
        const result = SubmitReviewSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Submit review business logic: notes required for rejection
  // -----------------------------------------------------------------------
  describe('submitReview business logic', () => {
    it('should require notes for rejection', async () => {
      await expect(
        submitReview('review-001', 'educator-001', 'rejected', undefined, undefined),
      ).rejects.toThrow('Notes are required when rejecting a suggestion');
    });

    it('should allow rejection with notes', async () => {
      vi.mocked(db.aiSuggestionReview.update).mockResolvedValue({
        id: 'review-001',
        reviewStatus: 'REJECTED',
      } as any);

      const result = await submitReview(
        'review-001',
        'educator-001',
        'rejected',
        undefined,
        'This response is not appropriate for the student level.',
      );

      expect(db.aiSuggestionReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-001' },
          data: expect.objectContaining({
            reviewStatus: 'REJECTED',
            reviewerNotes: 'This response is not appropriate for the student level.',
          }),
        }),
      );
    });

    it('should require edited content for approve_with_edits', async () => {
      await expect(
        submitReview('review-001', 'educator-001', 'approved_with_edits', undefined, 'some notes'),
      ).rejects.toThrow('Edited content is required when approving with edits');
    });

    it('should allow approve_with_edits with edited content', async () => {
      vi.mocked(db.aiSuggestionReview.update).mockResolvedValue({
        id: 'review-001',
        reviewStatus: 'APPROVED_WITH_EDITS',
      } as any);

      const result = await submitReview(
        'review-001',
        'educator-001',
        'approved_with_edits',
        'Edited version of the response.',
        'Fixed tone.',
      );

      expect(db.aiSuggestionReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewStatus: 'APPROVED_WITH_EDITS',
            editedContent: 'Edited version of the response.',
          }),
        }),
      );
    });

    it('should allow simple approval without notes or edits', async () => {
      vi.mocked(db.aiSuggestionReview.update).mockResolvedValue({
        id: 'review-001',
        reviewStatus: 'APPROVED',
      } as any);

      const result = await submitReview(
        'review-001',
        'educator-001',
        'approved',
      );

      expect(db.aiSuggestionReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewStatus: 'APPROVED',
          }),
        }),
      );
    });

    it('should set reviewedAt and reviewerId when submitting review', async () => {
      vi.mocked(db.aiSuggestionReview.update).mockResolvedValue({
        id: 'review-001',
        reviewStatus: 'APPROVED',
      } as any);

      await submitReview('review-001', 'educator-001', 'approved');

      expect(db.aiSuggestionReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewerId: 'educator-001',
            reviewedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // ReviewQueueFilters schema validation
  // -----------------------------------------------------------------------
  describe('ReviewQueueFiltersSchema validation', () => {
    it('should validate correct filter input', () => {
      const input = {
        suggestionType: 'TUTORING_RESPONSE' as const,
        priority: 5,
        status: 'PENDING_REVIEW' as const,
        page: 1,
        limit: 20,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      const result = ReviewQueueFiltersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should default page to 1', () => {
      const input = {};
      const result = ReviewQueueFiltersSchema.parse(input);
      expect(result.page).toBe(1);
    });

    it('should default limit to 20', () => {
      const input = {};
      const result = ReviewQueueFiltersSchema.parse(input);
      expect(result.limit).toBe(20);
    });

    it('should default sortBy to createdAt', () => {
      const input = {};
      const result = ReviewQueueFiltersSchema.parse(input);
      expect(result.sortBy).toBe('createdAt');
    });

    it('should default sortOrder to desc', () => {
      const input = {};
      const result = ReviewQueueFiltersSchema.parse(input);
      expect(result.sortOrder).toBe('desc');
    });

    it('should reject limit above 100', () => {
      const input = { limit: 150 };
      const result = ReviewQueueFiltersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const input = { page: 0 };
      const result = ReviewQueueFiltersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid sortBy value', () => {
      const input = { sortBy: 'invalidField' };
      const result = ReviewQueueFiltersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid sortOrder value', () => {
      const input = { sortOrder: 'random' };
      const result = ReviewQueueFiltersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept sortBy: priority', () => {
      const input = { sortBy: 'priority' as const };
      const result = ReviewQueueFiltersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept all valid statuses', () => {
      const statuses = [
        'PENDING_REVIEW',
        'APPROVED',
        'APPROVED_WITH_EDITS',
        'REJECTED',
        'EXPIRED',
      ] as const;

      for (const status of statuses) {
        const input = { status };
        const result = ReviewQueueFiltersSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Enum schemas
  // -----------------------------------------------------------------------
  describe('enum schemas', () => {
    it('should validate SuggestionTypeSchema values', () => {
      expect(SuggestionTypeSchema.safeParse('TUTORING_RESPONSE').success).toBe(true);
      expect(SuggestionTypeSchema.safeParse('IEP_RECOMMENDATION').success).toBe(true);
      expect(SuggestionTypeSchema.safeParse('ASSESSMENT_FEEDBACK').success).toBe(true);
      expect(SuggestionTypeSchema.safeParse('ACCOMMODATION_SUGGESTION').success).toBe(true);
      expect(SuggestionTypeSchema.safeParse('PROGRESS_NOTE').success).toBe(true);
      expect(SuggestionTypeSchema.safeParse('INVALID').success).toBe(false);
    });

    it('should validate ReviewStatusSchema values', () => {
      expect(ReviewStatusSchema.safeParse('PENDING_REVIEW').success).toBe(true);
      expect(ReviewStatusSchema.safeParse('APPROVED').success).toBe(true);
      expect(ReviewStatusSchema.safeParse('APPROVED_WITH_EDITS').success).toBe(true);
      expect(ReviewStatusSchema.safeParse('REJECTED').success).toBe(true);
      expect(ReviewStatusSchema.safeParse('EXPIRED').success).toBe(true);
      expect(ReviewStatusSchema.safeParse('INVALID').success).toBe(false);
    });

    it('should validate ReviewDecisionSchema values', () => {
      expect(ReviewDecisionSchema.safeParse('approved').success).toBe(true);
      expect(ReviewDecisionSchema.safeParse('approved_with_edits').success).toBe(true);
      expect(ReviewDecisionSchema.safeParse('rejected').success).toBe(true);
      expect(ReviewDecisionSchema.safeParse('APPROVED').success).toBe(false); // case-sensitive
    });
  });

  // -----------------------------------------------------------------------
  // createSuggestionReview service function
  // -----------------------------------------------------------------------
  describe('createSuggestionReview', () => {
    it('should call db.aiSuggestionReview.create with validated data', async () => {
      vi.mocked(db.aiSuggestionReview.create).mockResolvedValue({
        id: 'review-new',
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE',
        originalContent: 'AI response content.',
        reviewStatus: 'PENDING_REVIEW',
      } as any);

      const result = await createSuggestionReview({
        tenantId: 'tenant-001',
        studentId: 'student-001',
        suggestionType: 'TUTORING_RESPONSE',
        originalContent: 'AI response content.',
      });

      expect(db.aiSuggestionReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-001',
            studentId: 'student-001',
            suggestionType: 'TUTORING_RESPONSE',
            originalContent: 'AI response content.',
          }),
        }),
      );
    });

    it('should throw on invalid input', async () => {
      await expect(
        createSuggestionReview({
          tenantId: '',
          studentId: 'student-001',
          suggestionType: 'TUTORING_RESPONSE',
          originalContent: 'Content.',
        }),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // getReviewQueue service function
  // -----------------------------------------------------------------------
  describe('getReviewQueue', () => {
    it('should return paginated results', async () => {
      vi.mocked(db.aiSuggestionReview.findMany).mockResolvedValue([
        { id: 'r1' } as any,
        { id: 'r2' } as any,
      ]);
      vi.mocked(db.aiSuggestionReview.count).mockResolvedValue(10);

      const result = await getReviewQueue('tenant-001', {
        page: 1,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should apply correct skip for pagination', async () => {
      vi.mocked(db.aiSuggestionReview.findMany).mockResolvedValue([]);
      vi.mocked(db.aiSuggestionReview.count).mockResolvedValue(0);

      await getReviewQueue('tenant-001', {
        page: 3,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(db.aiSuggestionReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // expireStaleReviews
  // -----------------------------------------------------------------------
  describe('expireStaleReviews', () => {
    it('should update stale reviews to EXPIRED status', async () => {
      vi.mocked(db.aiSuggestionReview.updateMany).mockResolvedValue({ count: 3 } as any);

      const result = await expireStaleReviews();

      expect(result.expiredCount).toBe(3);
      expect(db.aiSuggestionReview.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reviewStatus: 'PENDING_REVIEW',
            expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
          }),
          data: { reviewStatus: 'EXPIRED' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // getReviewStats
  // -----------------------------------------------------------------------
  describe('getReviewStats', () => {
    it('should return stats with correct structure', async () => {
      vi.mocked(db.aiSuggestionReview.count)
        .mockResolvedValueOnce(5)   // pendingCount
        .mockResolvedValueOnce(10)  // approvedToday
        .mockResolvedValueOnce(2)   // rejectedToday
        .mockResolvedValueOnce(15); // totalReviewed

      vi.mocked(db.aiSuggestionReview.findMany).mockResolvedValue([
        {
          createdAt: new Date('2026-02-09T10:00:00Z'),
          reviewedAt: new Date('2026-02-09T10:30:00Z'),
        },
        {
          createdAt: new Date('2026-02-09T11:00:00Z'),
          reviewedAt: new Date('2026-02-09T11:15:00Z'),
        },
      ] as any);

      const result = await getReviewStats('tenant-001');

      expect(result).toHaveProperty('pendingCount');
      expect(result).toHaveProperty('approvedToday');
      expect(result).toHaveProperty('rejectedToday');
      expect(result).toHaveProperty('reviewedToday');
      expect(result).toHaveProperty('totalReviewed');
      expect(result).toHaveProperty('avgReviewTimeMinutes');
      expect(result).toHaveProperty('approvalRate');
    });
  });
});
