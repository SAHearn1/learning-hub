/**
 * Progress Monitoring Gate Evaluator
 *
 * Runs all 6 PM rules against a ProgressMonitoringContext and returns
 * a composite validation result. Pure function — no DB access.
 */

import type {
  ProgressMonitoringContext,
  ProgressMonitoringValidationResult,
} from '@/types/progress-monitoring';
import { ALL_PM_RULES } from './pm-rules';

export function evaluateProgressMonitoring(
  ctx: ProgressMonitoringContext,
): ProgressMonitoringValidationResult {
  const results = ALL_PM_RULES.map((rule) => rule.evaluate(ctx));
  const passed = results.every((r) => r.passed);

  return {
    passed,
    goalId: ctx.goal.id,
    rules: results,
  };
}
