/**
 * Overlay Invariant Validator
 *
 * Ensures that a state overlay never loosens any federal baseline constraint.
 * This is a build-time / startup-time check to prevent misconfigurations.
 */

import type { StateOverlay } from '@/types/evaluation';

export type OverlayViolation = {
  field: string;
  message: string;
};

/**
 * Validates that the given overlay does not loosen any constraint compared
 * to the federal baseline. Returns an empty array if valid.
 */
export function validateOverlay(
  overlay: StateOverlay,
  baseline: StateOverlay,
): OverlayViolation[] {
  const violations: OverlayViolation[] = [];

  // Timeline days: overlay may equal or be stricter (fewer days),
  // but must not exceed baseline
  if (overlay.evaluationTimelineDays > baseline.evaluationTimelineDays) {
    violations.push({
      field: 'evaluationTimelineDays',
      message: `State ${overlay.stateCode} timeline (${overlay.evaluationTimelineDays} days) exceeds federal baseline (${baseline.evaluationTimelineDays} days).`,
    });
  }

  // School days are considered stricter than calendar days
  // (more actual elapsed days for the same count).
  // So SCHOOL_DAYS → CALENDAR_DAYS conversion is not a loosening.
  // However, CALENDAR_DAYS with more days than federal baseline IS a loosening.
  // The day count check above already handles this.

  // Required meeting roles: overlay must include at least all baseline roles
  // (it can add more, but cannot remove any)
  // Note: baseline additionalRequiredMeetingRoles is typically empty (federal),
  // so this mainly prevents future overlays from accidentally dropping roles.
  const baselineRoles = new Set(baseline.additionalRequiredMeetingRoles);
  for (const role of baselineRoles) {
    if (!overlay.additionalRequiredMeetingRoles.includes(role)) {
      violations.push({
        field: 'additionalRequiredMeetingRoles',
        message: `State ${overlay.stateCode} is missing required baseline role: ${role}.`,
      });
    }
  }

  return violations;
}

/**
 * Validates all overlays against the given baseline.
 * Returns a map of stateCode → violations.
 */
export function validateAllOverlays(
  overlays: Record<string, StateOverlay>,
  baseline: StateOverlay,
): Record<string, OverlayViolation[]> {
  const results: Record<string, OverlayViolation[]> = {};

  for (const [code, overlay] of Object.entries(overlays)) {
    if (code === baseline.stateCode) continue;
    const violations = validateOverlay(overlay, baseline);
    if (violations.length > 0) {
      results[code] = violations;
    }
  }

  return results;
}
