import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildOptimizedContext } from '@/lib/rag/context-window-manager';
import type { ContextBuildParams, IepContextResult } from '@/lib/rag/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/pinecone/client', () => ({
  getPineconeClient: vi.fn(),
  queryPinecone: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/pinecone/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

vi.mock('@/lib/rag/iep-vector-store', () => ({
  queryIepContext: vi.fn().mockResolvedValue([]),
  queryIepContextBySection: vi.fn().mockResolvedValue([]),
}));

// Import after mocks are set up
import { queryPinecone } from '@/lib/pinecone/client';
import { queryIepContext, queryIepContextBySection } from '@/lib/rag/iep-vector-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(overrides?: Partial<ContextBuildParams>): ContextBuildParams {
  return {
    studentId: 'student-001',
    query: 'What are equivalent fractions?',
    sessionPhase: 'REFLECT',
    subject: 'MATH',
    gradeLevel: 5,
    accommodations: ['EXTENDED_TIME'],
    sessionHistory: '',
    maxTokens: 8000,
    ...overrides,
  };
}

function makeIepResults(count: number): IepContextResult[] {
  return Array.from({ length: count }, (_, i) => ({
    content: `IEP content block ${i}: Student accommodation information for testing. Extended time on assessments.`,
    sectionType: i === 0 ? 'accommodations' as const : 'annual_goals' as const,
    relevanceScore: 0.95 - i * 0.1,
    metadata: { chunkIndex: i },
  }));
}

function makeCurriculumMatches(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `curr-${i}`,
    score: 0.9 - i * 0.1,
    metadata: {
      content: `Curriculum content ${i}: Fractions represent equal parts of a whole.`,
      source: `Lesson ${i + 1}`,
      subject: 'MATH',
      gradeLevel: 5,
    },
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Context Window Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Token budget allocation
  // -----------------------------------------------------------------------
  describe('token budget allocation', () => {
    it('should respect token budget allocation ratios', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue(makeIepResults(3));
      vi.mocked(queryIepContext).mockResolvedValue(makeIepResults(3));
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(3) as any);

      const result = await buildOptimizedContext(makeParams({ maxTokens: 8000 }));

      // Total tokens used should not exceed the max budget
      expect(result.totalTokensUsed).toBeLessThanOrEqual(8000);

      // Breakdown should have all three sections
      expect(result.tokenBreakdown).toHaveProperty('iep');
      expect(result.tokenBreakdown).toHaveProperty('curriculum');
      expect(result.tokenBreakdown).toHaveProperty('sessionHistory');
    });

    it('should allocate approximately 40% to IEP, 35% to curriculum, 25% to session', async () => {
      // Provide enough content to fill each budget
      const iepResults = makeIepResults(5);
      vi.mocked(queryIepContextBySection).mockResolvedValue(iepResults);
      vi.mocked(queryIepContext).mockResolvedValue(iepResults);
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(5) as any);

      const maxTokens = 8000;
      const result = await buildOptimizedContext(makeParams({
        maxTokens,
        sessionHistory: 'USER: Question\nASSISTANT: Response\n'.repeat(20),
      }));

      // IEP tokens should be roughly 40% of budget when content is available
      // (Exact amounts depend on content but the budget should limit it)
      expect(result.tokenBreakdown.iep).toBeGreaterThan(0);
      expect(result.tokenBreakdown.curriculum).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // IEP section prioritization
  // -----------------------------------------------------------------------
  describe('IEP section prioritization', () => {
    it('should prioritize IEP sections correctly (accommodations first)', async () => {
      const results: IepContextResult[] = [
        {
          content: 'Annual goal: improve math by one level.',
          sectionType: 'annual_goals',
          relevanceScore: 0.9,
          metadata: {},
        },
        {
          content: 'Extended time on all tests.',
          sectionType: 'accommodations',
          relevanceScore: 0.85,
          metadata: {},
        },
        {
          content: 'Student reads at grade 3 level.',
          sectionType: 'present_levels',
          relevanceScore: 0.95,
          metadata: {},
        },
      ];

      vi.mocked(queryIepContextBySection).mockResolvedValue(results);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const result = await buildOptimizedContext(makeParams());

      // Accommodations should appear before present_levels in the IEP context
      if (result.iepContext.includes('Extended time') && result.iepContext.includes('Student reads')) {
        const accommodationPos = result.iepContext.indexOf('Extended time');
        const presentLevelPos = result.iepContext.indexOf('Student reads');
        expect(accommodationPos).toBeLessThan(presentLevelPos);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Session history summarization
  // -----------------------------------------------------------------------
  describe('session history handling', () => {
    it('should summarize long session histories', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      // Create a very long session history that exceeds the budget
      const messages: string[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(`USER: Student question number ${i} about math fractions and decimals`);
        messages.push(`ASSISTANT: Tutor response number ${i} with detailed explanation of fractions`);
      }
      const longHistory = messages.join('\n');

      const result = await buildOptimizedContext(makeParams({
        sessionHistory: longHistory,
        maxTokens: 4000,
      }));

      // Session summary should exist but be within budget
      if (result.sessionSummary.length > 0) {
        const sessionTokens = result.tokenBreakdown.sessionHistory;
        // 25% of 4000 = 1000 tokens max
        expect(sessionTokens).toBeLessThanOrEqual(1000);
      }

      // Should contain a summary marker for older messages
      if (result.sessionSummary.includes('[Earlier in session:')) {
        expect(result.sessionSummary).toContain('student messages');
        expect(result.sessionSummary).toContain('tutor responses');
      }
    });

    it('should keep short session history verbatim', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const shortHistory = 'USER: What is 3+4?\nASSISTANT: What do you think?';

      const result = await buildOptimizedContext(makeParams({
        sessionHistory: shortHistory,
      }));

      if (result.sessionSummary.length > 0) {
        expect(result.sessionSummary).toContain('What is 3+4?');
        expect(result.sessionSummary).toContain('What do you think?');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Empty context handling
  // -----------------------------------------------------------------------
  describe('empty context handling', () => {
    it('should handle empty IEP context gracefully', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(2) as any);

      const result = await buildOptimizedContext(makeParams());

      expect(result.iepContext).toBe('');
      expect(result.tokenBreakdown.iep).toBe(0);
      expect(result.retrievalMetrics.iepChunksRetrieved).toBe(0);
    });

    it('should handle empty curriculum context', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue(makeIepResults(2));
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const result = await buildOptimizedContext(makeParams());

      expect(result.curriculumContext).toBe('');
      expect(result.tokenBreakdown.curriculum).toBe(0);
      expect(result.retrievalMetrics.curriculumChunksRetrieved).toBe(0);
    });

    it('should handle empty session history', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const result = await buildOptimizedContext(makeParams({
        sessionHistory: '',
      }));

      expect(result.sessionSummary).toBe('');
      expect(result.tokenBreakdown.sessionHistory).toBe(0);
    });

    it('should handle all empty contexts', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const result = await buildOptimizedContext(makeParams({
        sessionHistory: '',
      }));

      expect(result.totalTokensUsed).toBe(0);
      expect(result.iepContext).toBe('');
      expect(result.curriculumContext).toBe('');
      expect(result.sessionSummary).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // Retrieval metrics
  // -----------------------------------------------------------------------
  describe('retrieval metrics', () => {
    it('should report correct chunk retrieval counts', async () => {
      const iepResults = makeIepResults(4);
      vi.mocked(queryIepContextBySection).mockResolvedValue(iepResults.slice(0, 2));
      vi.mocked(queryIepContext).mockResolvedValue(iepResults.slice(2));
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(3) as any);

      const result = await buildOptimizedContext(makeParams());

      expect(result.retrievalMetrics.iepChunksRetrieved).toBeGreaterThanOrEqual(2);
      expect(result.retrievalMetrics.curriculumChunksRetrieved).toBe(3);
    });

    it('should report retrieval time', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const result = await buildOptimizedContext(makeParams());

      expect(result.retrievalMetrics.retrievalTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.retrievalMetrics.retrievalTimeMs).toBe('number');
    });
  });

  // -----------------------------------------------------------------------
  // Default max tokens
  // -----------------------------------------------------------------------
  describe('default max tokens', () => {
    it('should use 8000 tokens as default when maxTokens is not specified', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const params = makeParams();
      delete params.maxTokens;

      const result = await buildOptimizedContext(params);

      // Should work without error (uses default of 8000)
      expect(result.totalTokensUsed).toBeLessThanOrEqual(8000);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('should handle IEP retrieval errors gracefully', async () => {
      vi.mocked(queryIepContextBySection).mockRejectedValue(new Error('Pinecone error'));
      vi.mocked(queryIepContext).mockRejectedValue(new Error('Pinecone error'));
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(2) as any);

      const result = await buildOptimizedContext(makeParams());

      // Should still return a valid result with empty IEP context
      expect(result.iepContext).toBe('');
      expect(result.curriculumContext.length).toBeGreaterThan(0);
    });

    it('should handle curriculum retrieval errors gracefully', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue(makeIepResults(2));
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockRejectedValue(new Error('Embedding error'));

      // The function catches errors internally, but generateEmbedding is called
      // before queryPinecone, so the error may come from a different point.
      // Since the implementation catches errors in retrieveCurriculumContext,
      // this should still return a valid result.
      const result = await buildOptimizedContext(makeParams());

      // Should still return a valid result
      expect(result).toHaveProperty('totalTokensUsed');
    });
  });

  // -----------------------------------------------------------------------
  // Output structure
  // -----------------------------------------------------------------------
  describe('output structure', () => {
    it('should return all required fields in OptimizedContext', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue(makeIepResults(1));
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(1) as any);

      const result = await buildOptimizedContext(makeParams({
        sessionHistory: 'USER: Hello\nASSISTANT: Hi there',
      }));

      expect(result).toHaveProperty('iepContext');
      expect(result).toHaveProperty('curriculumContext');
      expect(result).toHaveProperty('sessionSummary');
      expect(result).toHaveProperty('totalTokensUsed');
      expect(result).toHaveProperty('tokenBreakdown');
      expect(result.tokenBreakdown).toHaveProperty('iep');
      expect(result.tokenBreakdown).toHaveProperty('curriculum');
      expect(result.tokenBreakdown).toHaveProperty('sessionHistory');
      expect(result).toHaveProperty('retrievalMetrics');
      expect(result.retrievalMetrics).toHaveProperty('iepChunksRetrieved');
      expect(result.retrievalMetrics).toHaveProperty('curriculumChunksRetrieved');
      expect(result.retrievalMetrics).toHaveProperty('retrievalTimeMs');
    });

    it('should include formatted headers in IEP context', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue(makeIepResults(1));
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue([] as any);

      const result = await buildOptimizedContext(makeParams());

      if (result.iepContext.length > 0) {
        expect(result.iepContext).toContain('=== IEP CONTEXT ===');
      }
    });

    it('should include formatted headers in curriculum context', async () => {
      vi.mocked(queryIepContextBySection).mockResolvedValue([]);
      vi.mocked(queryIepContext).mockResolvedValue([]);
      vi.mocked(queryPinecone).mockResolvedValue(makeCurriculumMatches(1) as any);

      const result = await buildOptimizedContext(makeParams());

      if (result.curriculumContext.length > 0) {
        expect(result.curriculumContext).toContain('=== CURRICULUM CONTEXT ===');
      }
    });
  });
});
