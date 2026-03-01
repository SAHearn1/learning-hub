/**
 * Evaluation Case State Machine
 *
 * 12-state directed graph governing the evaluation lifecycle.
 * Each transition has guard rules that must pass before advancing.
 * Transitions are recorded as immutable, hash-chained records.
 */

import crypto from 'crypto';
import type {
  EvalCaseState,
  EvalCaseContext,
  EvalRuleResult,
  EvalTransition,
} from '@/types/evaluation';
import { ALL_EVAL_RULES } from './eval-rules';

// ---------------------------------------------------------------------------
// Transition Graph
// ---------------------------------------------------------------------------

export const TRANSITIONS: EvalTransition[] = [
  { from: 'EVAL_TRIGGERED', to: 'SAFEGUARDS_ISSUED', guardRules: ['IDEA_REFERRAL_001'] },
  { from: 'SAFEGUARDS_ISSUED', to: 'SAFEGUARDS_REQUIRED', guardRules: [] },
  { from: 'SAFEGUARDS_REQUIRED', to: 'CONSENT_REQUESTED', guardRules: ['IDEA_REFERRAL_002'] },
  { from: 'CONSENT_REQUESTED', to: 'CONSENT_RECEIVED', guardRules: ['IDEA_EVAL_INIT_001'] },
  { from: 'CONSENT_REQUESTED', to: 'CONSENT_REFUSED', guardRules: [] },
  { from: 'CONSENT_RECEIVED', to: 'EVALUATION_PLANNED', guardRules: ['IDEA_EVAL_INIT_002'] },
  { from: 'EVALUATION_PLANNED', to: 'ASSESSMENTS_IN_PROGRESS', guardRules: [] },
  { from: 'ASSESSMENTS_IN_PROGRESS', to: 'ASSESSMENTS_COMPLETE', guardRules: ['IDEA_EVAL_INIT_004'] },
  { from: 'ASSESSMENTS_COMPLETE', to: 'ELIGIBILITY_MEETING', guardRules: [] },
  { from: 'ELIGIBILITY_MEETING', to: 'ELIGIBILITY_DECISION', guardRules: ['IDEA_EVAL_INIT_005'] },
  { from: 'ELIGIBILITY_DECISION', to: 'CLOSED', guardRules: ['IDEA_EVAL_INIT_006'] },
  // Allow closing from consent refused
  { from: 'CONSENT_REFUSED', to: 'CLOSED', guardRules: [] },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransitionResult = {
  allowed: boolean;
  from: EvalCaseState;
  to: EvalCaseState;
  ruleResults: EvalRuleResult[];
  transitionHash: string | null;
};

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/** Get valid next states from the current state. */
export function getValidTransitions(currentState: EvalCaseState): EvalCaseState[] {
  return TRANSITIONS
    .filter((t) => t.from === currentState)
    .map((t) => t.to);
}

/** Check if a transition from → to is defined in the graph. */
export function isValidTransition(from: EvalCaseState, to: EvalCaseState): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/** Find the transition definition, or null if not valid. */
export function findTransition(from: EvalCaseState, to: EvalCaseState): EvalTransition | null {
  return TRANSITIONS.find((t) => t.from === from && t.to === to) ?? null;
}

/**
 * Evaluate a proposed transition. Runs all guard rules for the transition.
 * Returns a TransitionResult with pass/fail and individual rule results.
 * Does NOT mutate any state — pure validation.
 */
export function evaluateTransition(
  from: EvalCaseState,
  to: EvalCaseState,
  ctx: EvalCaseContext,
): TransitionResult {
  const transition = findTransition(from, to);

  if (!transition) {
    return {
      allowed: false,
      from,
      to,
      ruleResults: [{
        ruleCode: 'STATE_MACHINE',
        passed: false,
        severity: 'CRITICAL',
        legalReference: 'N/A',
        appliesTo: from,
        message: `Invalid transition: ${from} → ${to} is not defined in the evaluation state graph.`,
      }],
      transitionHash: null,
    };
  }

  // Run guard rules
  const guardRuleCodes = transition.guardRules;
  const ruleResults: EvalRuleResult[] = [];

  for (const ruleCode of guardRuleCodes) {
    const rule = ALL_EVAL_RULES.find((r) => r.ruleCode === ruleCode);
    if (rule) {
      ruleResults.push(rule.evaluate(ctx));
    }
  }

  const allowed = ruleResults.every((r) => r.passed);

  // Compute transition hash for immutable record
  const transitionHash = allowed
    ? crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            from,
            to,
            caseId: ctx.evaluationCase.id,
            ruleResults,
            timestamp: ctx.nowDate,
          }),
        )
        .digest('hex')
    : null;

  return { allowed, from, to, ruleResults, transitionHash };
}
