/**
 * Discipline Compliance Evaluator
 *
 * Runs all 5 discipline rules against a DisciplineContext.
 */

import type { DisciplineContext, DiscValidationResult } from '@/types/discipline';
import { ALL_DISC_RULES } from './disc-rules';

export function evaluateDisciplineCompliance(
  ctx: DisciplineContext,
): DiscValidationResult {
  const rules = ALL_DISC_RULES.map((rule) => rule.evaluate(ctx));
  const passed = rules.every((r) => r.passed);

  return {
    passed,
    caseId: ctx.disciplineCase.id,
    currentState: ctx.disciplineCase.currentState,
    rules,
  };
}
