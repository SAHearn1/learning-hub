import { describe, it, expect, beforeEach } from 'vitest';
import { detectHallucinations } from '@/lib/ai/guardrails/hallucination-detector';
import type { GuardrailContext } from '@/lib/ai/guardrails/types';

// ---------------------------------------------------------------------------
// Shared test context
// ---------------------------------------------------------------------------

function makeContext(overrides?: Partial<GuardrailContext>): GuardrailContext {
  return {
    sessionPhase: 'REFLECT',
    subject: 'MATH',
    gradeLevel: 5,
    accommodations: [],
    ragContext: '',
    sessionHistory: '',
    studentId: 'student-test-123',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Hallucination Detector', () => {
  let ctx: GuardrailContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  // -----------------------------------------------------------------------
  // Citation verification
  // -----------------------------------------------------------------------
  describe('citation verification', () => {
    it('should detect ungrounded citations not in context', () => {
      const ctx = makeContext({
        ragContext: 'In Module 1 we learned about addition. Module 2 covers subtraction.',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'As we discussed in Module 7, fractions are important.',
        ctx,
      );

      expect(result.ungroundedClaims.length).toBeGreaterThanOrEqual(1);
      expect(result.ungroundedClaims.some(
        (c) => c.claim.includes('Module 7'),
      )).toBe(true);
      expect(result.violations.some(
        (v) => v.category === 'hallucination' && v.message.includes('Module 7'),
      )).toBe(true);
    });

    it('should accept grounded citations from RAG context', () => {
      const ctx = makeContext({
        ragContext: 'Module 3 covers multiplication of whole numbers. Standard CCSS.Math.Content.3.NBT.A.1 is relevant.',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'In Module 3, we focus on multiplication as described in the curriculum.',
        ctx,
      );

      expect(result.groundedClaims.some(
        (c) => c.claim.includes('Module 3'),
      )).toBe(true);
    });

    it('should detect multiple ungrounded citations', () => {
      const ctx = makeContext({
        ragContext: 'Unit 1 covers basic addition.',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'In Chapter 12, we learned about this. Also see Lesson 4.2 and Section 9.1.',
        ctx,
      );

      expect(result.ungroundedClaims.length).toBeGreaterThanOrEqual(2);
    });

    it('should accept citations grounded in session history', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: 'We covered Unit 5 on fractions yesterday.',
      });

      const result = detectHallucinations(
        'Remember from Unit 5, fractions represent parts of a whole.',
        ctx,
      );

      expect(result.groundedClaims.some(
        (c) => c.claim.includes('Unit 5'),
      )).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Fabricated student data detection
  // -----------------------------------------------------------------------
  describe('fabricated student data detection', () => {
    it('should detect fabricated scores not in context', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'You scored 85% on the last assessment, so you are doing well.',
        ctx,
      );

      expect(result.fabricatedReferences.length).toBeGreaterThanOrEqual(1);
      expect(result.violations.some(
        (v) => v.message.includes('fabricated student data'),
      )).toBe(true);
    });

    it('should detect fabricated assessment results', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'Your assessment result: 65 which means you need to practice more.',
        ctx,
      );

      expect(result.fabricatedReferences.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect fabricated references like "according to your records"', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'According to your records, you have been struggling with algebra.',
        ctx,
      );

      expect(result.fabricatedReferences.length).toBeGreaterThanOrEqual(1);
      expect(result.fabricatedReferences.some(
        (ref) => ref.toLowerCase().includes('according to your records'),
      )).toBe(true);
    });

    it('should detect fabricated mastery levels', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'Your mastery level shows 4 out of 5 in this standard.',
        ctx,
      );

      expect(result.fabricatedReferences.length).toBeGreaterThanOrEqual(1);
    });

    it('should accept student data that IS in context', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: 'Assessment result: 72 for Module 3 quiz.',
      });

      const result = detectHallucinations(
        'Your assessment result: 72 from the quiz, so let us review that material.',
        ctx,
      );

      // Should NOT be flagged as fabricated since it's in session history
      expect(result.fabricatedReferences.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Confidence scoring
  // -----------------------------------------------------------------------
  describe('confidence scoring', () => {
    it('should give high confidence score for scaffolding-only responses', () => {
      const ctx = makeContext({
        ragContext: 'Fractions unit',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        "That's an interesting idea! What do you think happens when we add these numbers together? Can you walk me through your reasoning step by step?",
        ctx,
      );

      // No citations, no claims, no fabrications => scaffolding => 0.95
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
    });

    it('should give high confidence when all claims are grounded', () => {
      const ctx = makeContext({
        ragContext: 'Module 3 covers multiplication. The answer is derived by grouping sets.',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'In Module 3 we focus on multiplication.',
        ctx,
      );

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.8);
    });

    it('should give low confidence for responses with many ungrounded claims', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'According to your records, you scored 92%. In Module 15, the answer is 42. Research shows that this method is best. According to your assessment, you need help.',
        ctx,
      );

      expect(result.confidenceScore).toBeLessThan(0.5);
    });

    it('should add a high-severity violation when confidence is very low', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'According to your records, you scored 92%. In Module 15, the answer is clearly wrong. Your mastery level shows 2.',
        ctx,
      );

      if (result.confidenceScore < 0.5) {
        expect(result.violations.some(
          (v) => v.severity === 'high' && v.message.includes('Low grounding confidence'),
        )).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Factual grounding check
  // -----------------------------------------------------------------------
  describe('factual grounding check', () => {
    it('should detect ungrounded specific claims with context present', () => {
      const ctx = makeContext({
        ragContext: 'The curriculum covers basic operations for grade 5.',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'Research shows that this technique improves test scores by 40%.',
        ctx,
      );

      // "Research shows" is a specific claim pattern
      expect(result.ungroundedClaims.length).toBeGreaterThanOrEqual(1);
    });

    it('should accept grounded specific claims', () => {
      const ctx = makeContext({
        ragContext: 'According to the curriculum, fractions represent equal parts. The correct answer for 1/2 + 1/2 is 1.',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'According to the curriculum, fractions represent equal parts of a whole.',
        ctx,
      );

      expect(result.groundedClaims.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle empty AI response', () => {
      const result = detectHallucinations('', ctx);
      expect(result.confidenceScore).toBe(0.95);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle empty context gracefully', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = detectHallucinations(
        'Let me help you with that problem!',
        ctx,
      );

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle response with only questions', () => {
      const result = detectHallucinations(
        'What do you think about this? How would you approach it?',
        ctx,
      );
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
      expect(result.violations).toHaveLength(0);
    });
  });
});
