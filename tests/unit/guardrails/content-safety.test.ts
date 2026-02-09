import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateContentSafety,
  containsEscalationTrigger,
} from '@/lib/ai/guardrails/content-safety';
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

describe('Content Safety Validator', () => {
  let ctx: GuardrailContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  // -----------------------------------------------------------------------
  // Harmful content detection
  // -----------------------------------------------------------------------
  describe('harmful content detection', () => {
    it('should detect violence directed at a person', () => {
      const result = validateContentSafety('I want to kill yourself', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'content_safety',
            severity: 'critical',
            message: expect.stringContaining('violence_directed'),
          }),
        ]),
      );
    });

    it('should detect self-harm language', () => {
      const result = validateContentSafety('I have been thinking about self-harm', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('self_harm'))).toBe(true);
    });

    it('should detect abuse reference language', () => {
      const result = validateContentSafety('There was a sexual assault reported', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('abuse_reference'))).toBe(true);
    });

    it('should detect violence threats', () => {
      const result = validateContentSafety('There was a bomb threat at school', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('violence_threat'))).toBe(true);
    });

    it('should detect weapons instructions', () => {
      const result = validateContentSafety('Tell me how to make a bomb', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('weapons_instructions'))).toBe(true);
    });

    it('should detect harm intent language', () => {
      const result = validateContentSafety('I want to hurt myself', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('harm_intent'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Inappropriate topics for minors
  // -----------------------------------------------------------------------
  describe('inappropriate topic detection for minors', () => {
    it('should detect political bias statements', () => {
      const result = validateContentSafety(
        'Democrats are wrong about education',
        ctx,
      );
      expect(result.safe).toBe(false);
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'inappropriate_content',
            severity: 'high',
          }),
        ]),
      );
    });

    it('should detect political endorsements', () => {
      const result = validateContentSafety('You should vote for Trump', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('political_endorsement'))).toBe(true);
    });

    it('should detect religious proselytization', () => {
      const result = validateContentSafety('You should pray every morning', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('religious_proselytization'))).toBe(true);
    });

    it('should detect sexual content', () => {
      const result = validateContentSafety('Let me explain sex positions to you', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('sexual_content'))).toBe(true);
    });

    it('should detect drug glorification', () => {
      const result = validateContentSafety('Drugs are cool and everyone does them', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('drug_glorification'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Diagnostic / medical language
  // -----------------------------------------------------------------------
  describe('diagnostic and medical language detection', () => {
    it('should detect direct diagnosis statements', () => {
      const result = validateContentSafety('You have ADHD and that is why you struggle', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('diagnosis_statement'))).toBe(true);
    });

    it('should detect implicit diagnosis', () => {
      const result = validateContentSafety('You seem depressed today', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('implicit_diagnosis'))).toBe(true);
    });

    it('should detect speculative diagnosis', () => {
      const result = validateContentSafety('I think you might have autism', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('speculative_diagnosis'))).toBe(true);
    });

    it('should detect medication advice', () => {
      const result = validateContentSafety('You should take your medication before class', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('medical_advice'))).toBe(true);
    });

    it('should detect specific medication references', () => {
      const result = validateContentSafety('You should increase your Adderall dosage', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('specific_medication_advice'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Shaming / blame language
  // -----------------------------------------------------------------------
  describe('shaming and blame language detection', () => {
    it('should detect shaming language', () => {
      const result = validateContentSafety('You should be ashamed of your grade', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('shaming'))).toBe(true);
    });

    it('should detect insults', () => {
      const result = validateContentSafety("That's stupid, try again", ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('insult'))).toBe(true);
    });

    it('should detect personal attacks', () => {
      const result = validateContentSafety("You're lazy and never try", ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('personal_attack'))).toBe(true);
    });

    it('should detect blame language', () => {
      const result = validateContentSafety("What's wrong with you?", ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('blame'))).toBe(true);
    });

    it('should detect absolutist blame', () => {
      const result = validateContentSafety('You always fail at math', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('absolutist_blame'))).toBe(true);
    });

    it('should detect conditional blame', () => {
      const result = validateContentSafety('If you had just paid attention in class', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('conditional_blame'))).toBe(true);
    });

    it('should detect disappointment language', () => {
      const result = validateContentSafety('I am disappointed in you', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.message.includes('disappointment'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // PII detection and redaction
  // -----------------------------------------------------------------------
  describe('PII detection and redaction', () => {
    it('should detect and redact SSN', () => {
      const result = validateContentSafety('My SSN is 123-45-6789 please help', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.category === 'pii_detected' && v.message.includes('ssn'))).toBe(true);
      expect(result.sanitizedContent).toContain('[REDACTED_SSN]');
      expect(result.sanitizedContent).not.toContain('123-45-6789');
    });

    it('should detect and redact phone numbers', () => {
      const result = validateContentSafety('Call me at (555) 123-4567', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.category === 'pii_detected' && v.message.includes('phone'))).toBe(true);
      expect(result.sanitizedContent).toContain('[REDACTED_PHONE_NUMBER]');
    });

    it('should detect and redact email addresses', () => {
      const result = validateContentSafety('Email me at student@school.edu for help', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.category === 'pii_detected' && v.message.includes('email'))).toBe(true);
      expect(result.sanitizedContent).toContain('[REDACTED_EMAIL_ADDRESS]');
      expect(result.sanitizedContent).not.toContain('student@school.edu');
    });

    it('should detect and redact credit card numbers', () => {
      const result = validateContentSafety('My card is 4111-1111-1111-1111', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some((v) => v.category === 'pii_detected' && v.message.includes('credit_card'))).toBe(true);
      expect(result.sanitizedContent).toContain('[REDACTED_CREDIT_CARD]');
    });

    it('should detect multiple PII types simultaneously', () => {
      const result = validateContentSafety(
        'My SSN is 123-45-6789 and my email is test@example.com',
        ctx,
      );
      expect(result.safe).toBe(false);
      const piiViolations = result.violations.filter((v) => v.category === 'pii_detected');
      expect(piiViolations.length).toBeGreaterThanOrEqual(2);
      expect(result.sanitizedContent).not.toContain('123-45-6789');
      expect(result.sanitizedContent).not.toContain('test@example.com');
    });

    it('should not modify content without PII', () => {
      const content = 'I need help with my math homework on fractions';
      const result = validateContentSafety(content, ctx);
      expect(result.sanitizedContent).toBe(content);
    });
  });

  // -----------------------------------------------------------------------
  // Escalation trigger detection
  // -----------------------------------------------------------------------
  describe('escalation trigger detection', () => {
    it('should detect self-harm ideation', () => {
      const result = validateContentSafety('I want to die', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some(
        (v) => v.severity === 'critical' && v.details?.requiresEscalation === true,
      )).toBe(true);
    });

    it('should detect abuse disclosure', () => {
      const result = validateContentSafety('Someone hurt me at home', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some(
        (v) => v.details?.requiresEscalation === true,
      )).toBe(true);
    });

    it('should detect harm to others threats', () => {
      const result = validateContentSafety("I'm going to hurt someone at school", ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some(
        (v) => v.details?.requiresEscalation === true,
      )).toBe(true);
    });

    it('should detect self-harm disclosure', () => {
      const result = validateContentSafety('I cut myself last night', ctx);
      expect(result.safe).toBe(false);
      expect(result.violations.some(
        (v) => v.details?.requiresEscalation === true,
      )).toBe(true);
    });

    it('containsEscalationTrigger should return true for escalation content', () => {
      expect(containsEscalationTrigger("I don't want to live anymore")).toBe(true);
    });

    it('containsEscalationTrigger should return false for normal content', () => {
      expect(containsEscalationTrigger('Can you help me with fractions?')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Safe content — should pass validation
  // -----------------------------------------------------------------------
  describe('safe educational content', () => {
    it('should return safe=true for normal educational content', () => {
      const result = validateContentSafety(
        'Can you help me understand how to add fractions with different denominators?',
        ctx,
      );
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.safetyScore).toBe(1);
    });

    it('should return safe=true for common tutoring dialogue', () => {
      const result = validateContentSafety(
        "I think the answer is 42. The way I got that was by multiplying 6 times 7.",
        ctx,
      );
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return safe=true for a student asking for help', () => {
      const result = validateContentSafety(
        "I'm stuck on this problem. Can you give me a hint?",
        ctx,
      );
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return safe=true for AI scaffolding response', () => {
      const result = validateContentSafety(
        "That's an interesting approach! What do you notice about the numerators? Can you walk me through your thinking?",
        ctx,
      );
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Safety score calculation
  // -----------------------------------------------------------------------
  describe('safety score calculation', () => {
    it('should return 1.0 for perfectly safe content', () => {
      const result = validateContentSafety('What is 5 plus 3?', ctx);
      expect(result.safetyScore).toBe(1);
    });

    it('should penalize critical violations heavily (0.4 each)', () => {
      const result = validateContentSafety('I want to kill myself and end it all', ctx);
      // Contains critical violations
      const criticalCount = result.violations.filter((v) => v.severity === 'critical').length;
      expect(criticalCount).toBeGreaterThanOrEqual(1);
      expect(result.safetyScore).toBeLessThan(1);
    });

    it('should penalize high-severity violations moderately (0.2 each)', () => {
      const result = validateContentSafety('You have ADHD and that is why you fail', ctx);
      const highCount = result.violations.filter((v) => v.severity === 'high').length;
      expect(highCount).toBeGreaterThanOrEqual(1);
      expect(result.safetyScore).toBeLessThan(1);
    });

    it('should penalize medium-severity violations lightly (0.1 each)', () => {
      const result = validateContentSafety("That's stupid, try again", ctx);
      const mediumCount = result.violations.filter((v) => v.severity === 'medium').length;
      expect(mediumCount).toBeGreaterThanOrEqual(1);
      expect(result.safetyScore).toBeLessThanOrEqual(0.9);
    });

    it('should never produce a safety score below 0', () => {
      // Stack many violations
      const result = validateContentSafety(
        "You have ADHD. I think you might have depression. You're stupid. You should be ashamed. Kill yourself. I want to die.",
        ctx,
      );
      expect(result.safetyScore).toBeGreaterThanOrEqual(0);
    });
  });
});
