/**
 * Guardrails Engine — Main Orchestrator
 *
 * The `GuardrailsEngine` class coordinates all safety validation layers for
 * the RootWork Learning Hub AI tutor. It provides two primary entry points:
 *
 *   1. **Pre-generation** (`runPreGeneration`) — validates user input before
 *      it is sent to the AI model. Catches PII, harmful content, and
 *      escalation triggers in student messages.
 *
 *   2. **Post-generation** (`runPostGeneration`) — validates AI output before
 *      it is returned to the student. Checks content safety, hallucination,
 *      5Rs compliance, and IEP accommodation alignment.
 *
 * Both methods run all applicable guardrail layers in parallel for efficiency
 * and aggregate the results into a single response.
 *
 * @example
 * ```ts
 * import { GuardrailsEngine } from '@/lib/ai/guardrails';
 *
 * const engine = new GuardrailsEngine();
 * const context: GuardrailContext = { ... };
 *
 * // Before sending to model
 * const pre = engine.runPreGeneration(userMessage, context);
 * if (!pre.allowed) { // handle blocked input }
 *
 * // After receiving model output
 * const post = engine.runPostGeneration(aiOutput, context);
 * if (!post.passed) { // handle unsafe output }
 * ```
 */

import { z } from 'zod';
import { validateContentSafety, containsEscalationTrigger } from './content-safety';
import { detectHallucinations } from './hallucination-detector';
import { validateFiveRsCompliance } from './five-rs-compliance';
import { validateIepSafety } from './iep-safety';
import {
  GuardrailContextSchema,
  type GuardrailContext,
  type GuardrailResult,
  type PreGenerationResult,
  type PostGenerationResult,
  type Violation,
} from './types';

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export { validateContentSafety, containsEscalationTrigger } from './content-safety';
export { detectHallucinations } from './hallucination-detector';
export { validateFiveRsCompliance } from './five-rs-compliance';
export { validateIepSafety } from './iep-safety';
export type {
  Violation,
  ViolationSeverity,
  ViolationCategory,
  GuardrailResult,
  GuardrailContext,
  PreGenerationResult,
  PostGenerationResult,
  ContentSafetyResult,
  HallucinationCheck,
  FiveRsComplianceResult,
  IepSafetyResult,
} from './types';

// ---------------------------------------------------------------------------
// Engine configuration
// ---------------------------------------------------------------------------

const EngineOptionsSchema = z.object({
  /** Skip post-generation hallucination checks (e.g. for regulation-only messages). */
  skipHallucinationCheck: z.boolean().optional().default(false),
  /** Skip 5Rs compliance check (e.g. for system-generated messages). */
  skipFiveRsCheck: z.boolean().optional().default(false),
  /** Skip IEP safety check (e.g. when no accommodations are active). */
  skipIepCheck: z.boolean().optional().default(false),
});
type EngineOptions = z.infer<typeof EngineOptionsSchema>;

// ---------------------------------------------------------------------------
// GuardrailsEngine
// ---------------------------------------------------------------------------

/**
 * Orchestrates all guardrail layers for pre- and post-generation validation.
 */
export class GuardrailsEngine {
  private readonly options: EngineOptions;

  constructor(options?: Partial<EngineOptions>) {
    this.options = EngineOptionsSchema.parse(options ?? {});
  }

  // -----------------------------------------------------------------------
  // Pre-generation — validates user input
  // -----------------------------------------------------------------------

  /**
   * Run pre-generation guardrails on user input.
   *
   * Checks performed:
   *   - Content safety (harmful content, inappropriate topics, diagnostic language)
   *   - PII detection and redaction
   *   - Escalation trigger detection
   *
   * @param userInput - The raw student message.
   * @param context   - Session context.
   * @returns A {@link PreGenerationResult}.
   */
  runPreGeneration(userInput: string, context: GuardrailContext): PreGenerationResult {
    const parsed = GuardrailContextSchema.safeParse(context);
    if (!parsed.success) {
      return {
        allowed: false,
        sanitizedInput: '',
        violations: [{
          category: 'content_safety',
          severity: 'critical',
          message: 'Invalid guardrail context provided',
          details: { zodErrors: parsed.error.flatten() },
        }],
      };
    }

    const violations: Violation[] = [];

    // Content safety check on user input
    const safety = validateContentSafety(userInput, parsed.data);
    violations.push(...safety.violations);

    // The input is blocked if any critical or high-severity violations exist
    const hasCritical = violations.some((v) => v.severity === 'critical');
    const hasHigh = violations.some((v) => v.severity === 'high' && v.category === 'content_safety');

    // For escalation triggers in user messages, we still allow the message
    // through (the student may be asking for help) but flag for educator
    // notification. The calling code should handle the escalation.
    const hasEscalation = containsEscalationTrigger(userInput);
    if (hasEscalation) {
      // Escalation violations are already in the list from content safety.
      // We do NOT block the student — we let the message through so the AI
      // can provide a supportive response, but the caller must notify an
      // educator.
    }

    return {
      allowed: !hasCritical && !hasHigh,
      sanitizedInput: safety.sanitizedContent,
      violations,
    };
  }

  // -----------------------------------------------------------------------
  // Post-generation — validates AI output
  // -----------------------------------------------------------------------

  /**
   * Run post-generation guardrails on AI output.
   *
   * Checks performed (unless skipped via options):
   *   - Content safety
   *   - Hallucination detection
   *   - 5Rs framework compliance
   *   - IEP accommodation safety
   *
   * @param aiOutput - The generated AI response text.
   * @param context  - Session context.
   * @returns A {@link PostGenerationResult}.
   */
  runPostGeneration(aiOutput: string, context: GuardrailContext): PostGenerationResult {
    const parsed = GuardrailContextSchema.safeParse(context);
    if (!parsed.success) {
      return {
        passed: false,
        sanitizedOutput: '',
        violations: [{
          category: 'content_safety',
          severity: 'critical',
          message: 'Invalid guardrail context provided',
          details: { zodErrors: parsed.error.flatten() },
        }],
        confidenceScore: 0,
        hallucinationScore: 0,
        fiveRsAlignmentScore: 0,
      };
    }

    const ctx = parsed.data;
    const violations: Violation[] = [];
    let sanitizedOutput = aiOutput;

    // 1. Content safety
    const safety = validateContentSafety(aiOutput, ctx);
    violations.push(...safety.violations);
    sanitizedOutput = safety.sanitizedContent;

    // 2. Hallucination detection
    let hallucinationScore = 1;
    if (!this.options.skipHallucinationCheck) {
      const hallucination = detectHallucinations(aiOutput, ctx);
      violations.push(...hallucination.violations);
      hallucinationScore = hallucination.confidenceScore;
    }

    // 3. 5Rs compliance
    let fiveRsAlignmentScore = 1;
    if (!this.options.skipFiveRsCheck) {
      const fiveRs = validateFiveRsCompliance(aiOutput, ctx);
      violations.push(...fiveRs.violations);
      fiveRsAlignmentScore = fiveRs.phaseAlignmentScore;
    }

    // 4. IEP safety
    if (!this.options.skipIepCheck && ctx.accommodations.length > 0) {
      const iep = validateIepSafety(aiOutput, ctx);
      violations.push(...iep.violations);
    }

    // Determine overall pass / fail.
    // Fail if any critical violation, or more than one high-severity violation.
    const criticalCount = violations.filter((v) => v.severity === 'critical').length;
    const highCount = violations.filter((v) => v.severity === 'high').length;
    const passed = criticalCount === 0 && highCount <= 1;

    // Confidence score is the lower of hallucination and safety scores
    const confidenceScore = Math.min(hallucinationScore, safety.safetyScore);

    return {
      passed,
      sanitizedOutput,
      violations,
      confidenceScore,
      hallucinationScore,
      fiveRsAlignmentScore,
    };
  }

  // -----------------------------------------------------------------------
  // Full pipeline — convenience method running both pre and post
  // -----------------------------------------------------------------------

  /**
   * Run the full guardrails pipeline on a user-input / AI-output pair.
   *
   * This is a convenience wrapper that calls {@link runPreGeneration} and
   * {@link runPostGeneration} and aggregates the results into a single
   * {@link GuardrailResult}.
   *
   * @param userInput - The raw student message.
   * @param aiOutput  - The generated AI response text.
   * @param context   - Session context.
   * @returns A comprehensive {@link GuardrailResult}.
   */
  runFullPipeline(
    userInput: string,
    aiOutput: string,
    context: GuardrailContext,
  ): GuardrailResult {
    const start = performance.now();

    const pre = this.runPreGeneration(userInput, context);
    const post = this.runPostGeneration(aiOutput, context);

    const allViolations = [...pre.violations, ...post.violations];
    const processingTimeMs = Math.round(performance.now() - start);

    // Sanitized content is the post-generation sanitized output (the part
    // that actually reaches the student).
    const sanitizedContent = post.sanitizedOutput;

    const passed = pre.allowed && post.passed;

    return {
      passed,
      violations: allViolations,
      sanitizedContent,
      confidenceScore: post.confidenceScore,
      processingTimeMs,
      metadata: {
        checksRun: this.getChecksRun(),
        hallucinationScore: post.hallucinationScore,
        fiveRsAlignmentScore: post.fiveRsAlignmentScore,
        contentSafetyScore: passed ? 1 : Math.max(0, 1 - allViolations.length * 0.15),
      },
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** List of checks that will be executed based on current options. */
  private getChecksRun(): string[] {
    const checks = ['content_safety', 'pii_detection', 'escalation_detection'];
    if (!this.options.skipHallucinationCheck) checks.push('hallucination_detection');
    if (!this.options.skipFiveRsCheck) checks.push('five_rs_compliance');
    if (!this.options.skipIepCheck) checks.push('iep_safety');
    return checks;
  }
}
