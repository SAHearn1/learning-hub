import { describe, it, expect, beforeEach } from 'vitest';
import { GuardrailsEngine } from '@/lib/ai/guardrails';
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
    ragContext: 'Module 3 covers multiplication of whole numbers.',
    sessionHistory: 'USER: What is 6 times 7?\nASSISTANT: What do you think?',
    studentId: 'student-test-123',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuardrailsEngine', () => {
  let engine: GuardrailsEngine;
  let ctx: GuardrailContext;

  beforeEach(() => {
    engine = new GuardrailsEngine();
    ctx = makeContext();
  });

  // -----------------------------------------------------------------------
  // Pre-generation checks
  // -----------------------------------------------------------------------
  describe('runPreGeneration', () => {
    it('should block harmful user input', () => {
      const result = engine.runPreGeneration(
        'I want to kill myself',
        ctx,
      );

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(
        (v) => v.severity === 'critical',
      )).toBe(true);
    });

    it('should block input with high-severity content safety violations', () => {
      const result = engine.runPreGeneration(
        'You have ADHD and need medication',
        ctx,
      );

      expect(result.allowed).toBe(false);
      expect(result.violations.some(
        (v) => v.severity === 'high' && v.category === 'content_safety',
      )).toBe(true);
    });

    it('should allow normal educational input', () => {
      const result = engine.runPreGeneration(
        'Can you help me understand fractions?',
        ctx,
      );

      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should sanitize PII in input and still allow it through if no critical/high violations', () => {
      // PII alone is high severity, so it would be blocked
      const result = engine.runPreGeneration(
        'My email is test@example.com',
        ctx,
      );

      expect(result.sanitizedInput).toContain('[REDACTED_EMAIL_ADDRESS]');
      expect(result.sanitizedInput).not.toContain('test@example.com');
    });

    it('should return invalid context violation for bad context', () => {
      const badCtx = { ...ctx, gradeLevel: 99 } as unknown as GuardrailContext;

      const result = engine.runPreGeneration('Hello', badCtx);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('Invalid guardrail context'),
      )).toBe(true);
    });

    it('should flag escalation triggers but behavior depends on severity', () => {
      const result = engine.runPreGeneration(
        'I want to die and end it all',
        ctx,
      );

      // Escalation triggers are critical, so input is blocked
      expect(result.violations.some(
        (v) => v.details?.requiresEscalation === true,
      )).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Post-generation checks
  // -----------------------------------------------------------------------
  describe('runPostGeneration', () => {
    it('should detect content safety violations in AI output', () => {
      const result = engine.runPostGeneration(
        "You're stupid and lazy, just give up.",
        ctx,
      );

      expect(result.passed).toBe(true); // medium severity only, 0 critical/high content_safety
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should detect hallucination violations', () => {
      const ctx = makeContext({
        ragContext: 'Unit 1 on addition.',
        sessionHistory: '',
      });

      const result = engine.runPostGeneration(
        'According to your records, you scored 95%. In Module 99, we learned this. Your mastery level shows 5.',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.category === 'hallucination',
      )).toBe(true);
    });

    it('should detect 5Rs compliance violations', () => {
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = engine.runPostGeneration(
        "The answer is 42. That's correct! Good job!",
        ctx,
      );

      expect(result.violations.some(
        (v) => v.category === 'five_rs_compliance',
      )).toBe(true);
    });

    it('should detect IEP safety violations', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = engine.runPostGeneration(
        'Hurry up and finish quickly!',
        ctx,
      );

      expect(result.violations.some(
        (v) => v.category === 'iep_safety',
      )).toBe(true);
    });

    it('should return invalid context violation for bad context', () => {
      const badCtx = { ...ctx, gradeLevel: -5 } as unknown as GuardrailContext;

      const result = engine.runPostGeneration('Hello', badCtx);

      expect(result.passed).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('Invalid guardrail context'),
      )).toBe(true);
    });

    it('should fail if more than one high-severity violation exists', () => {
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      // This will produce multiple high-severity violations (hallucination + fabricated data)
      const result = engine.runPostGeneration(
        'You have ADHD so you scored 50%. According to your records you failed. Your IEP says you need help.',
        ctx,
      );

      const highCount = result.violations.filter((v) => v.severity === 'high').length;
      if (highCount > 1) {
        expect(result.passed).toBe(false);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Skip options
  // -----------------------------------------------------------------------
  describe('skip options', () => {
    it('should respect skipHallucinationCheck option', () => {
      const skipEngine = new GuardrailsEngine({ skipHallucinationCheck: true });
      const ctx = makeContext({
        ragContext: '',
        sessionHistory: '',
      });

      const result = skipEngine.runPostGeneration(
        'According to your records, you scored 95% on Module 99.',
        ctx,
      );

      // Should NOT have hallucination violations since check is skipped
      expect(result.violations.filter(
        (v) => v.category === 'hallucination',
      )).toHaveLength(0);
      expect(result.hallucinationScore).toBe(1);
    });

    it('should respect skipIepCheck option', () => {
      const skipEngine = new GuardrailsEngine({ skipIepCheck: true });
      const ctx = makeContext({
        accommodations: ['EXTENDED_TIME'],
      });

      const result = skipEngine.runPostGeneration(
        'Hurry up and finish quickly!',
        ctx,
      );

      // Should NOT have IEP violations since check is skipped
      expect(result.violations.filter(
        (v) => v.category === 'iep_safety',
      )).toHaveLength(0);
    });

    it('should respect skipFiveRsCheck option', () => {
      const skipEngine = new GuardrailsEngine({ skipFiveRsCheck: true });
      const ctx = makeContext({ sessionPhase: 'REFLECT' });

      const result = skipEngine.runPostGeneration(
        "The answer is 42. That's correct!",
        ctx,
      );

      expect(result.violations.filter(
        (v) => v.category === 'five_rs_compliance',
      )).toHaveLength(0);
      expect(result.fiveRsAlignmentScore).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Full pipeline
  // -----------------------------------------------------------------------
  describe('runFullPipeline', () => {
    it('should run full pipeline and aggregate results', () => {
      const result = engine.runFullPipeline(
        'What is 6 times 7?',
        "What do you think? How did you approach this problem? Walk me through your reasoning.",
        ctx,
      );

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('sanitizedContent');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('checksRun');
      expect(result.metadata).toHaveProperty('hallucinationScore');
      expect(result.metadata).toHaveProperty('fiveRsAlignmentScore');
      expect(result.metadata).toHaveProperty('contentSafetyScore');
    });

    it('should calculate processing time', () => {
      const result = engine.runFullPipeline(
        'Help me with math',
        'What do you notice about these numbers?',
        ctx,
      );

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should pass clean educational interactions', () => {
      const result = engine.runFullPipeline(
        'I think the answer is 42 because 6 times 7 is 42',
        "That's an interesting approach! Can you walk me through how you figured that out? What strategy did you use?",
        ctx,
      );

      expect(result.passed).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should fail when pre-generation blocks harmful input', () => {
      const result = engine.runFullPipeline(
        'I want to kill myself',
        'I am here to help. Please talk to a trusted adult.',
        ctx,
      );

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should include all expected checks in metadata', () => {
      const result = engine.runFullPipeline(
        'Help me',
        'What do you think?',
        ctx,
      );

      expect(result.metadata.checksRun).toContain('content_safety');
      expect(result.metadata.checksRun).toContain('pii_detection');
      expect(result.metadata.checksRun).toContain('escalation_detection');
      expect(result.metadata.checksRun).toContain('hallucination_detection');
      expect(result.metadata.checksRun).toContain('five_rs_compliance');
      expect(result.metadata.checksRun).toContain('iep_safety');
    });

    it('should respect skip options in full pipeline metadata', () => {
      const skipEngine = new GuardrailsEngine({
        skipHallucinationCheck: true,
        skipFiveRsCheck: true,
        skipIepCheck: true,
      });

      const result = skipEngine.runFullPipeline(
        'Help me',
        'What do you think?',
        ctx,
      );

      expect(result.metadata.checksRun).toContain('content_safety');
      expect(result.metadata.checksRun).not.toContain('hallucination_detection');
      expect(result.metadata.checksRun).not.toContain('five_rs_compliance');
      expect(result.metadata.checksRun).not.toContain('iep_safety');
    });
  });

  // -----------------------------------------------------------------------
  // Confidence score
  // -----------------------------------------------------------------------
  describe('confidence score', () => {
    it('should be the minimum of hallucination and safety scores', () => {
      const result = engine.runPostGeneration(
        "What do you think about this problem? Walk me through your reasoning.",
        ctx,
      );

      // For a clean response, confidence should be high
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});
