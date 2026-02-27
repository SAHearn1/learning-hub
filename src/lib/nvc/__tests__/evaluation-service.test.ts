import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createNVCEvaluation,
  getPendingNVCEvaluations,
  getFlaggedNVCEvaluations,
  updateNVCEvaluationReview,
  getNVCEvaluationStats,
} from '../evaluation-service';

// Mock the evaluator
vi.mock('../evaluator', () => ({
  evaluateNVCCompliance: vi.fn(),
}));

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    nVCQualityEvaluation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('NVC Evaluation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNVCEvaluation', () => {
    it('should create an evaluation when LLM evaluation succeeds', async () => {
      const { evaluateNVCCompliance } = await import('../evaluator');
      const { db } = await import('@/lib/db');

      const mockEvaluation = {
        isCompliant: true,
        nvcScore: 90,
        concerns: [],
        judgmentalPhrases: [],
        dismissivePhrases: [],
        suggestedRevisions: [],
        rawAnalysis: 'Good compliance',
        llmTokens: 150,
        llmLatencyMs: 500,
      };

      vi.mocked(evaluateNVCCompliance).mockResolvedValueOnce(mockEvaluation);
      vi.mocked(db.nVCQualityEvaluation.create).mockResolvedValueOnce({
        id: 'eval-123',
        ...mockEvaluation,
        messageId: 'msg-123',
        sessionId: 'session-123',
        tenantId: 'tenant-123',
        evaluatedAt: new Date(),
        llmModel: 'claude-3-haiku-20240307',
        reviewStatus: 'APPROVED',
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        adminAction: null,
        actionTakenAt: null,
      } as any);

      const result = await createNVCEvaluation({
        messageId: 'msg-123',
        sessionId: 'session-123',
        tenantId: 'tenant-123',
        assistantResponse: 'Great work!',
        conversationContext: 'USER: I did it!',
      });

      expect(result).toBe('eval-123');
      expect(evaluateNVCCompliance).toHaveBeenCalledWith('Great work!', 'USER: I did it!');
      expect(db.nVCQualityEvaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId: 'msg-123',
          sessionId: 'session-123',
          tenantId: 'tenant-123',
          isCompliant: true,
          nvcScore: 90,
          reviewStatus: 'APPROVED',
        }),
      });
    });

    it('should set reviewStatus to PENDING for non-compliant responses', async () => {
      const { evaluateNVCCompliance } = await import('../evaluator');
      const { db } = await import('@/lib/db');

      const mockEvaluation = {
        isCompliant: false,
        nvcScore: 45,
        concerns: ['JUDGMENTAL_LANGUAGE'],
        judgmentalPhrases: ['You\'re wrong'],
        dismissivePhrases: [],
        suggestedRevisions: ['Try a gentler approach'],
        rawAnalysis: 'Needs improvement',
        llmTokens: 200,
        llmLatencyMs: 600,
      };

      vi.mocked(evaluateNVCCompliance).mockResolvedValueOnce(mockEvaluation as never);
      vi.mocked(db.nVCQualityEvaluation.create).mockResolvedValueOnce({
        id: 'eval-456',
        ...mockEvaluation,
        messageId: 'msg-456',
        sessionId: 'session-456',
        tenantId: 'tenant-456',
        evaluatedAt: new Date(),
        llmModel: 'claude-3-haiku-20240307',
        reviewStatus: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        adminAction: null,
        actionTakenAt: null,
      } as any);

      const result = await createNVCEvaluation({
        messageId: 'msg-456',
        sessionId: 'session-456',
        tenantId: 'tenant-456',
        assistantResponse: 'You\'re wrong about this.',
      });

      expect(result).toBe('eval-456');
      expect(db.nVCQualityEvaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isCompliant: false,
          reviewStatus: 'PENDING',
        }),
      });
    });

    it('should return null if LLM evaluation fails', async () => {
      const { evaluateNVCCompliance } = await import('../evaluator');

      vi.mocked(evaluateNVCCompliance).mockResolvedValueOnce(null);

      const result = await createNVCEvaluation({
        messageId: 'msg-789',
        sessionId: 'session-789',
        tenantId: 'tenant-789',
        assistantResponse: 'Test',
      });

      expect(result).toBeNull();
    });

    it('should return null if database creation fails', async () => {
      const { evaluateNVCCompliance } = await import('../evaluator');
      const { db } = await import('@/lib/db');

      vi.mocked(evaluateNVCCompliance).mockResolvedValueOnce({
        isCompliant: true,
        nvcScore: 85,
        concerns: [],
        judgmentalPhrases: [],
        dismissivePhrases: [],
        suggestedRevisions: [],
        rawAnalysis: 'Good',
        llmTokens: 150,
        llmLatencyMs: 500,
      });

      vi.mocked(db.nVCQualityEvaluation.create).mockRejectedValueOnce(
        new Error('Database error')
      );

      const result = await createNVCEvaluation({
        messageId: 'msg-error',
        sessionId: 'session-error',
        tenantId: 'tenant-error',
        assistantResponse: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  describe('getPendingNVCEvaluations', () => {
    it('should fetch pending evaluations for a tenant', async () => {
      const { db } = await import('@/lib/db');

      const mockEvaluations = [
        {
          id: 'eval-1',
          messageId: 'msg-1',
          sessionId: 'session-1',
          evaluatedAt: new Date(),
          isCompliant: false,
          nvcScore: 50,
          concerns: ['JUDGMENTAL_LANGUAGE'],
          reviewStatus: 'PENDING',
          message: {
            id: 'msg-1',
            content: 'Response 1',
            role: 'ASSISTANT',
            createdAt: new Date(),
          },
        },
      ];

      vi.mocked(db.nVCQualityEvaluation.findMany).mockResolvedValueOnce(mockEvaluations as any);

      const results = await getPendingNVCEvaluations('tenant-123', 50);

      expect(results).toEqual(mockEvaluations);
      expect(db.nVCQualityEvaluation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          reviewStatus: 'PENDING',
        },
        include: expect.any(Object),
        orderBy: { evaluatedAt: 'desc' },
        take: 50,
      });
    });

    it('should return empty array on error', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.nVCQualityEvaluation.findMany).mockRejectedValueOnce(
        new Error('Database error')
      );

      const results = await getPendingNVCEvaluations('tenant-123');

      expect(results).toEqual([]);
    });
  });

  describe('getFlaggedNVCEvaluations', () => {
    it('should fetch flagged (non-compliant) evaluations', async () => {
      const { db } = await import('@/lib/db');

      const mockEvaluations = [
        {
          id: 'eval-1',
          messageId: 'msg-1',
          sessionId: 'session-1',
          evaluatedAt: new Date(),
          isCompliant: false,
          nvcScore: 30,
          concerns: ['JUDGMENTAL_LANGUAGE', 'DISMISSIVE_TONE'],
          judgmentalPhrases: ['wrong'],
          dismissivePhrases: ['don\'t worry'],
          suggestedRevisions: ['be gentler'],
          reviewStatus: 'FLAGGED',
          message: {
            id: 'msg-1',
            content: 'Problematic response',
            role: 'ASSISTANT',
            createdAt: new Date(),
          },
        },
      ];

      vi.mocked(db.nVCQualityEvaluation.findMany).mockResolvedValueOnce(mockEvaluations as any);

      const results = await getFlaggedNVCEvaluations('tenant-123', 25);

      expect(results).toEqual(mockEvaluations);
      expect(db.nVCQualityEvaluation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          isCompliant: false,
          reviewStatus: {
            in: ['PENDING', 'FLAGGED'],
          },
        },
        include: expect.any(Object),
        orderBy: { nvcScore: 'asc' }, // Worst scores first
        take: 25,
      });
    });
  });

  describe('updateNVCEvaluationReview', () => {
    it('should update evaluation review status', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.nVCQualityEvaluation.update).mockResolvedValueOnce({} as any);

      const result = await updateNVCEvaluationReview('eval-123', {
        reviewStatus: 'APPROVED',
        reviewedBy: 'user-123',
        reviewNotes: 'Looks good',
        adminAction: 'NONE',
      });

      expect(result).toBe(true);
      expect(db.nVCQualityEvaluation.update).toHaveBeenCalledWith({
        where: { id: 'eval-123' },
        data: expect.objectContaining({
          reviewStatus: 'APPROVED',
          reviewedBy: 'user-123',
          reviewNotes: 'Looks good',
          adminAction: 'NONE',
          reviewedAt: expect.any(Date),
          actionTakenAt: expect.any(Date),
        }),
      });
    });

    it('should return false on error', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.nVCQualityEvaluation.update).mockRejectedValueOnce(
        new Error('Database error')
      );

      const result = await updateNVCEvaluationReview('eval-123', {
        reviewStatus: 'APPROVED',
        reviewedBy: 'user-123',
      });

      expect(result).toBe(false);
    });
  });

  describe('getNVCEvaluationStats', () => {
    it('should calculate statistics correctly', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.nVCQualityEvaluation.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // compliant
        .mockResolvedValueOnce(20)  // non-compliant
        .mockResolvedValueOnce(10)  // pending
        .mockResolvedValueOnce(5)   // flagged
        .mockResolvedValueOnce(85); // reviewed

      vi.mocked(db.nVCQualityEvaluation.findMany).mockResolvedValueOnce([
        { nvcScore: 90, concerns: ['JUDGMENTAL_LANGUAGE'] },
        { nvcScore: 85, concerns: ['DISMISSIVE_TONE'] },
        { nvcScore: 95, concerns: [] },
        { nvcScore: 70, concerns: ['JUDGMENTAL_LANGUAGE', 'LACK_OF_EMPATHY'] },
      ] as any);

      const stats = await getNVCEvaluationStats('tenant-123');

      expect(stats.total).toBe(100);
      expect(stats.compliant).toBe(80);
      expect(stats.nonCompliant).toBe(20);
      expect(stats.pending).toBe(10);
      expect(stats.flagged).toBe(5);
      expect(stats.reviewed).toBe(85);
      expect(stats.averageScore).toBe(85); // (90 + 85 + 95 + 70) / 4 = 85
      expect(stats.topConcerns.length).toBeGreaterThan(0);
    });

    it('should return zero stats on error', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.nVCQualityEvaluation.count).mockRejectedValueOnce(
        new Error('Database error')
      );

      const stats = await getNVCEvaluationStats('tenant-123');

      expect(stats.total).toBe(0);
      expect(stats.compliant).toBe(0);
      expect(stats.nonCompliant).toBe(0);
      expect(stats.averageScore).toBe(0);
    });
  });
});
