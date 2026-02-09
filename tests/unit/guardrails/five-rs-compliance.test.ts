import { describe, it, expect, beforeEach } from 'vitest';
import { validateFiveRsCompliance } from '@/lib/ai/guardrails/five-rs-compliance';
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

describe('5Rs Compliance Validator', () => {
  let ctx: GuardrailContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  // -----------------------------------------------------------------------
  // REFLECT phase scaffolding
  // -----------------------------------------------------------------------
  describe('REFLECT phase scaffolding', () => {
    it('should pass when REFLECT response contains scaffolding questions', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        "What do you think happens when we add 1/2 and 1/3? Can you walk me through your thinking? How did you arrive at that answer?",
        ctx,
      );

      expect(result.compliant).toBe(true);
      expect(result.traceAdherence.asksForReasoning).toBe(true);
      expect(result.traceAdherence.scaffoldsInsteadOfTelling).toBe(true);
    });

    it('should flag when AI confirms correctness without asking for reasoning first', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        "Yes, that's correct! Great job!",
        ctx,
      );

      expect(result.violations.some(
        (v) => v.message.includes('confirmed correctness without first asking'),
      )).toBe(true);
      expect(result.traceAdherence.scaffoldsInsteadOfTelling).toBe(false);
    });

    it('should detect direct answers in REFLECT phase', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        'The answer is 42. The correct answer is obtained by multiplying 6 times 7.',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.message.includes('direct answer instead of scaffolding'),
      )).toBe(true);
      expect(result.traceAdherence.scaffoldsInsteadOfTelling).toBe(false);
    });

    it('should allow confirmation AFTER asking for reasoning', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        "How did you get that answer? Can you explain your reasoning? Great, yes that's correct!",
        ctx,
      );

      // Reasoning request appears BEFORE the direct answer
      expect(result.violations.some(
        (v) => v.message.includes('confirmed correctness without first asking'),
      )).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // CHUNKED_CONTENT accommodation
  // -----------------------------------------------------------------------
  describe('CHUNKED_CONTENT accommodation', () => {
    it('should validate response length with CHUNKED_CONTENT accommodation', () => {
      const ctx = makeContext({
        sessionPhase: 'REFLECT',
        accommodations: ['CHUNKED_CONTENT'],
      });

      // Response exceeding 500 chars
      const longResponse = 'A'.repeat(600) + ' What do you think about this?';

      const result = validateFiveRsCompliance(longResponse, ctx);

      expect(result.violations.some(
        (v) => v.message.includes('CHUNKED_CONTENT limit'),
      )).toBe(true);
    });

    it('should pass for short responses with CHUNKED_CONTENT accommodation', () => {
      const ctx = makeContext({
        sessionPhase: 'REFLECT',
        accommodations: ['CHUNKED_CONTENT'],
      });

      const result = validateFiveRsCompliance(
        'What do you think about this problem?',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.details?.accommodation === 'CHUNKED_CONTENT',
      )).toBe(false);
    });

    it('should flag too many sentences with CHUNKED_CONTENT accommodation', () => {
      const ctx = makeContext({
        sessionPhase: 'REFLECT',
        accommodations: ['CHUNKED_CONTENT'],
      });

      // 6+ sentences but under 500 chars
      const multiSentence = 'One. Two. Three. Four. Five. Six. Seven.';

      const result = validateFiveRsCompliance(multiSentence, ctx);

      expect(result.violations.some(
        (v) => v.message.includes('too many sentences for CHUNKED_CONTENT'),
      )).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // SIMPLIFIED_MODE accommodation
  // -----------------------------------------------------------------------
  describe('SIMPLIFIED_MODE accommodation', () => {
    it('should validate word complexity with SIMPLIFIED_MODE accommodation', () => {
      const ctx = makeContext({
        sessionPhase: 'REFLECT',
        accommodations: ['SIMPLIFIED_MODE'],
      });

      // Very long words to push average word length above 7
      const complexResponse = 'Conceptualization extrapolation differentiation contextualization approximation';

      const result = validateFiveRsCompliance(complexResponse, ctx);

      expect(result.violations.some(
        (v) => v.message.includes('SIMPLIFIED_MODE threshold'),
      )).toBe(true);
    });

    it('should pass simple vocabulary with SIMPLIFIED_MODE accommodation', () => {
      const ctx = makeContext({
        sessionPhase: 'REFLECT',
        accommodations: ['SIMPLIFIED_MODE'],
      });

      const result = validateFiveRsCompliance(
        'What do you see in this set of dots?',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.details?.accommodation === 'SIMPLIFIED_MODE',
      )).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Wrong-phase indicators
  // -----------------------------------------------------------------------
  describe('wrong-phase indicators', () => {
    it('should flag grounding language in REFLECT phase', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      // ROOT phase indicators like "grounding" and "take a breath" when phase is REFLECT
      // and no REFLECT indicators present
      const result = validateFiveRsCompliance(
        'Take a breath and let us do some grounding before we begin. How is your day going?',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.message.includes('instead of current REFLECT phase'),
      )).toBe(true);
    });

    it('should not flag wrong-phase when current phase indicators are present', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        'What do you think about this problem? Walk me through your thinking. Let us take a breath while you consider.',
        ctx,
      );

      // REFLECT indicators are present, so wrong-phase detection should not trigger
      expect(result.violations.some(
        (v) => v.message.includes('instead of current'),
      )).toBe(false);
    });

    it('should detect RECONNECT language during ROOT phase', () => {
      const ctx = makeContext({ sessionPhase: 'ROOT' });

      // RECONNECT indicators with no ROOT indicators
      const result = validateFiveRsCompliance(
        'How could you use this in the real-world? What did you learn today? Can you apply this next time?',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.message.includes('instead of current ROOT phase'),
      )).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // TRACE protocol usage
  // -----------------------------------------------------------------------
  describe('TRACE protocol usage', () => {
    it('should detect TRACE protocol usage in REFLECT phase', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        "What do you notice about the numbers? Walk me through your approach. How do you know that's right?",
        ctx,
      );

      expect(result.traceAdherence.usesTraceSteps).toBe(true);
    });

    it('should flag missing TRACE steps in REFLECT phase', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      // Generic response with no TRACE indicators at all
      const result = validateFiveRsCompliance(
        'Good morning! I am ready to help you learn today.',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.message.includes('TRACE protocol steps'),
      )).toBe(true);
      expect(result.traceAdherence.usesTraceSteps).toBe(false);
    });

    it('should not require TRACE steps outside REFLECT phase', () => {
      const ctx = makeContext({ sessionPhase: 'ROOT' });

      const result = validateFiveRsCompliance(
        'How are you feeling today? Ready to get started?',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.message.includes('TRACE protocol steps'),
      )).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Phase alignment scoring
  // -----------------------------------------------------------------------
  describe('phase alignment scoring', () => {
    it('should give high alignment score for well-matched REFLECT response', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        'What do you think about this? Can you explain your reasoning? Why did you choose that approach? Tell me about your thinking.',
        ctx,
      );

      expect(result.phaseAlignmentScore).toBeGreaterThan(0.5);
    });

    it('should give high alignment score for well-matched ROOT response', () => {
      const ctx = makeContext({ sessionPhase: 'ROOT' });

      const result = validateFiveRsCompliance(
        "How are you feeling today? Take a moment to settle in. Let's check in before we begin.",
        ctx,
      );

      expect(result.phaseAlignmentScore).toBeGreaterThan(0.5);
    });

    it('should return 1.0 alignment for unknown phases', () => {
      const ctx = makeContext({ sessionPhase: 'UNKNOWN_PHASE' });

      const result = validateFiveRsCompliance(
        'Hello, let us begin today.',
        ctx,
      );

      expect(result.phaseAlignmentScore).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Clean responses
  // -----------------------------------------------------------------------
  describe('clean educational responses', () => {
    it('should pass a well-structured REFLECT scaffolding response', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = validateFiveRsCompliance(
        "What do you notice about these two fractions? Can you explain your reasoning for choosing that answer?",
        ctx,
      );

      expect(result.compliant).toBe(true);
      expect(result.traceAdherence.asksForReasoning).toBe(true);
      expect(result.traceAdherence.scaffoldsInsteadOfTelling).toBe(true);
    });

    it('should pass a REGULATE phase response', () => {
      const ctx = makeContext({ sessionPhase: 'REGULATE' });

      const result = validateFiveRsCompliance(
        "Take your time with this. That's okay if you need a break. These challenges help your brain grow new connections.",
        ctx,
      );

      expect(result.compliant).toBe(true);
    });
  });
});
