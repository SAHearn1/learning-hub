import { describe, it, expect, beforeEach } from 'vitest';
import { validateIepSafety } from '@/lib/ai/guardrails/iep-safety';
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

describe('IEP Safety Guardrails', () => {
  let ctx: GuardrailContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  // -----------------------------------------------------------------------
  // IEP modification recommendations
  // -----------------------------------------------------------------------
  describe('IEP modification detection', () => {
    it('should detect direct IEP modification recommendations', () => {
      const result = validateIepSafety(
        'You should change your IEP to include more math support.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.category === 'unauthorized_recommendation' &&
               v.message.includes('must not recommend changes to IEP'),
      )).toBe(true);
    });

    it('should detect suggestions to update accommodations', () => {
      const result = validateIepSafety(
        'I recommend changing your accommodation plan to allow more time.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.category === 'unauthorized_recommendation',
      )).toBe(true);
    });

    it('should detect "you don\'t need" accommodation language', () => {
      const result = validateIepSafety(
        "You don't need this accommodation anymore, you have improved.",
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.category === 'unauthorized_recommendation',
      )).toBe(true);
    });

    it('should detect "outgrown" accommodation language', () => {
      const result = validateIepSafety(
        "You've outgrown this accommodation, let us remove it.",
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.category === 'unauthorized_recommendation',
      )).toBe(true);
    });

    it('should detect "let us modify your IEP" language', () => {
      const result = validateIepSafety(
        "Let's modify your IEP to better suit your needs.",
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.category === 'unauthorized_recommendation',
      )).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // IEP disclosure to student
  // -----------------------------------------------------------------------
  describe('IEP disclosure detection', () => {
    it('should detect direct IEP disclosure', () => {
      const result = validateIepSafety(
        'Your IEP says you need extended time for tests.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.category === 'iep_safety' &&
               v.message.includes('must not disclose IEP details'),
      )).toBe(true);
    });

    it('should detect "according to your IEP" language', () => {
      const result = validateIepSafety(
        'According to your IEP, you should receive visual supports.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('must not disclose IEP details'),
      )).toBe(true);
    });

    it('should detect individualized education program references', () => {
      const result = validateIepSafety(
        'Your individualized education program requires frequent breaks.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('must not disclose IEP details'),
      )).toBe(true);
    });

    it('should detect special education plan references', () => {
      const result = validateIepSafety(
        'Your special education plan includes modified assessments.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('must not disclose IEP details'),
      )).toBe(true);
    });

    it('should detect "you have an IEP" references', () => {
      const result = validateIepSafety(
        'Since you have an IEP, we will adjust the difficulty.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('must not disclose IEP details'),
      )).toBe(true);
    });

    it('should detect disability/diagnosis disclosure', () => {
      const result = validateIepSafety(
        'Your disability means you need extra support with reading.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('must not disclose IEP details'),
      )).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // EXTENDED_TIME accommodation — rushing language prohibited
  // -----------------------------------------------------------------------
  describe('EXTENDED_TIME accommodation', () => {
    it('should flag "hurry up" with EXTENDED_TIME accommodation', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = validateIepSafety(
        'Hurry up, we need to finish this section quickly.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('EXTENDED_TIME accommodation'),
      )).toBe(true);
      expect(result.accommodationAlignment['EXTENDED_TIME']).toBe(false);
    });

    it('should flag "quickly" with EXTENDED_TIME accommodation', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = validateIepSafety(
        'Try to solve this quickly so we can move on.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.accommodationAlignment['EXTENDED_TIME']).toBe(false);
    });

    it('should flag "time is running out" with EXTENDED_TIME accommodation', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = validateIepSafety(
        "Time's running out, let us speed up!",
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.accommodationAlignment['EXTENDED_TIME']).toBe(false);
    });

    it('should flag "we need to move on" with EXTENDED_TIME accommodation', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = validateIepSafety(
        'We need to move on to the next topic now.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.accommodationAlignment['EXTENDED_TIME']).toBe(false);
    });

    it('should pass patient language with EXTENDED_TIME', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = validateIepSafety(
        'Take your time with this problem. There is no rush.',
        ctx,
      );

      expect(result.accommodationAlignment['EXTENDED_TIME']).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // CHUNKED_CONTENT accommodation — long responses prohibited
  // -----------------------------------------------------------------------
  describe('CHUNKED_CONTENT accommodation', () => {
    it('should flag long responses with CHUNKED_CONTENT accommodation', () => {
      const ctx = makeContext({ accommodations: ['CHUNKED_CONTENT'] });

      // Response exceeding 500 chars
      const longResponse = 'This is a detailed explanation. '.repeat(20);

      const result = validateIepSafety(longResponse, ctx);

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('exceeds max length for CHUNKED_CONTENT'),
      )).toBe(true);
      expect(result.accommodationAlignment['CHUNKED_CONTENT']).toBe(false);
    });

    it('should pass short responses with CHUNKED_CONTENT accommodation', () => {
      const ctx = makeContext({ accommodations: ['CHUNKED_CONTENT'] });

      const result = validateIepSafety(
        'What is 3 plus 4?',
        ctx,
      );

      expect(result.accommodationAlignment['CHUNKED_CONTENT']).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // MODIFIED_DIFFICULTY accommodation — difficulty override prohibited
  // -----------------------------------------------------------------------
  describe('MODIFIED_DIFFICULTY accommodation', () => {
    it('should flag difficulty override with MODIFIED_DIFFICULTY accommodation', () => {
      const ctx = makeContext({ accommodations: ['MODIFIED_DIFFICULTY'] });

      const result = validateIepSafety(
        "Let's try something much harder now. You are ready for more advanced work.",
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('inappropriate difficulty increase'),
      )).toBe(true);
      expect(result.accommodationAlignment['MODIFIED_DIFFICULTY']).toBe(false);
    });

    it('should flag "this is too easy for you" with MODIFIED_DIFFICULTY', () => {
      const ctx = makeContext({ accommodations: ['MODIFIED_DIFFICULTY'] });

      const result = validateIepSafety(
        'This is too easy for you, let us skip ahead to harder problems.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.accommodationAlignment['MODIFIED_DIFFICULTY']).toBe(false);
    });

    it('should flag "you should already know this" with MODIFIED_DIFFICULTY', () => {
      const ctx = makeContext({ accommodations: ['MODIFIED_DIFFICULTY'] });

      const result = validateIepSafety(
        'You should already know this material by now.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.some(
        (v) => v.message.includes('MODIFIED_DIFFICULTY accommodation'),
      )).toBe(true);
    });

    it('should pass supportive difficulty language with MODIFIED_DIFFICULTY', () => {
      const ctx = makeContext({ accommodations: ['MODIFIED_DIFFICULTY'] });

      const result = validateIepSafety(
        "Let's start with a simpler version of this problem. We will build up step by step.",
        ctx,
      );

      expect(result.accommodationAlignment['MODIFIED_DIFFICULTY']).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // FREQUENT_BREAKS accommodation
  // -----------------------------------------------------------------------
  describe('FREQUENT_BREAKS accommodation', () => {
    it('should flag "no break" language with FREQUENT_BREAKS', () => {
      const ctx = makeContext({ accommodations: ['FREQUENT_BREAKS'] });

      const result = validateIepSafety(
        'No break right now, we need to keep working.',
        ctx,
      );

      expect(result.compliant).toBe(false);
      expect(result.accommodationAlignment['FREQUENT_BREAKS']).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Clean responses with active accommodations
  // -----------------------------------------------------------------------
  describe('clean responses with active accommodations', () => {
    it('should pass clean response with EXTENDED_TIME', () => {
      const ctx = makeContext({ accommodations: ['EXTENDED_TIME'] });

      const result = validateIepSafety(
        'Take all the time you need to think about this problem. What ideas do you have?',
        ctx,
      );

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass clean response with multiple accommodations', () => {
      const ctx = makeContext({
        accommodations: ['EXTENDED_TIME', 'SIMPLIFIED_MODE', 'MODIFIED_DIFFICULTY'],
      });

      const result = validateIepSafety(
        'Look at the dots. How many do you see?',
        ctx,
      );

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass response with no accommodations at all', () => {
      const ctx = makeContext({ accommodations: [] });

      const result = validateIepSafety(
        'Great thinking! What do you notice about the pattern?',
        ctx,
      );

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should track unknown accommodations as aligned', () => {
      const ctx = makeContext({ accommodations: ['CUSTOM_ACCOMMODATION_XYZ'] });

      const result = validateIepSafety(
        'Let us work on this problem together.',
        ctx,
      );

      expect(result.compliant).toBe(true);
      expect(result.accommodationAlignment['CUSTOM_ACCOMMODATION_XYZ']).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Accommodation alignment tracking
  // -----------------------------------------------------------------------
  describe('accommodation alignment tracking', () => {
    it('should track alignment status for each active accommodation', () => {
      const ctx = makeContext({
        accommodations: ['EXTENDED_TIME', 'CHUNKED_CONTENT'],
      });

      const result = validateIepSafety(
        'Think about it. No rush.',
        ctx,
      );

      expect(result.accommodationAlignment).toHaveProperty('EXTENDED_TIME');
      expect(result.accommodationAlignment).toHaveProperty('CHUNKED_CONTENT');
    });
  });
});
