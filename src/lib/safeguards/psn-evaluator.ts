/**
 * PSN Gate Evaluator
 *
 * Runs the applicable rule(s) for a given trigger, plus always checks the
 * annual obligation (PSN_001). Returns a composite validation result.
 */

import type {
  ProceduralSafeguardsContext,
  ProceduralSafeguardsValidationResult,
} from '@/types/safeguards';
import { ALL_PSN_RULES, PSN_001 } from './psn-rules';

export function evaluateProceduralSafeguards(
  ctx: ProceduralSafeguardsContext,
): ProceduralSafeguardsValidationResult {
  const triggerRules = ALL_PSN_RULES.filter((r) => r.trigger === ctx.trigger);

  // Always include the annual obligation check
  const rulesToRun =
    ctx.trigger === 'ANNUAL_NOTICE'
      ? triggerRules
      : [PSN_001, ...triggerRules];

  // De-duplicate by ruleCode
  const seen = new Set<string>();
  const uniqueRules = rulesToRun.filter((r) => {
    if (seen.has(r.ruleCode)) return false;
    seen.add(r.ruleCode);
    return true;
  });

  const results = uniqueRules.map((rule) => rule.evaluate(ctx));
  const passed = results.every((r) => r.passed);

  return {
    passed,
    trigger: ctx.trigger,
    rules: results,
  };
}
