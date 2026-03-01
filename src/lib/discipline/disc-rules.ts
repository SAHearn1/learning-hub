/**
 * IDEA Discipline Protections — Rules
 *
 * Five rules covering 34 CFR §300.530–§300.536.
 */

import type { DisciplineContext, DiscRuleResult } from '@/types/discipline';

export type DiscRule = {
  ruleCode: string;
  evaluate: (ctx: DisciplineContext) => DiscRuleResult;
};

// ---------------------------------------------------------------------------
// IDEA_DISC_001 — 10-day cumulative removal threshold
// A removal beyond 10 cumulative school days in a school year constitutes
// a change of placement, triggering additional protections.
// ---------------------------------------------------------------------------
export const DISC_001: DiscRule = {
  ruleCode: 'IDEA_DISC_001',
  evaluate(ctx) {
    const totalDays = ctx.schoolYearCases.reduce(
      (sum, c) => sum + c.removalDays,
      0,
    );
    const passed = totalDays <= 10;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.530(b)',
      message: passed
        ? `${totalDays} cumulative removal days this school year (within 10-day threshold).`
        : `${totalDays} cumulative removal days exceeds the 10-day threshold. This constitutes a potential change of placement requiring additional protections.`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_DISC_002 — Manifestation Determination Review (MDR) required
// When a removal constitutes a change of placement (>10 days cumulative
// or single removal >10 days), an MDR must be conducted within 10 school
// days of the decision to change placement.
// ---------------------------------------------------------------------------
export const DISC_002: DiscRule = {
  ruleCode: 'IDEA_DISC_002',
  evaluate(ctx) {
    if (!ctx.disciplineCase.isChangeOfPlacement) {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'CRITICAL',
        legalReference: '34 CFR §300.530(e)',
        message: 'Not a change of placement — MDR not required.',
      };
    }

    const hasMdr = ctx.manifestDetermination !== null;
    return {
      ruleCode: this.ruleCode,
      passed: hasMdr,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.530(e)',
      message: hasMdr
        ? 'Manifestation Determination Review has been conducted.'
        : 'MDR is REQUIRED within 10 school days of the decision to change placement.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_DISC_003 — PSN required at disciplinary change of placement
// ---------------------------------------------------------------------------
export const DISC_003: DiscRule = {
  ruleCode: 'IDEA_DISC_003',
  evaluate(ctx) {
    if (!ctx.disciplineCase.isChangeOfPlacement) {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'CRITICAL',
        legalReference: '34 CFR §300.530(h)',
        message: 'Not a change of placement — PSN not required for discipline.',
      };
    }

    return {
      ruleCode: this.ruleCode,
      passed: ctx.psnDelivered,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.530(h)',
      message: ctx.psnDelivered
        ? 'Procedural safeguards notice delivered for disciplinary change of placement.'
        : 'PSN is REQUIRED when discipline results in a change of placement.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_DISC_004 — Services must continue during discipline
// After the 10th cumulative day of removal, the student must continue
// to receive educational services.
// ---------------------------------------------------------------------------
export const DISC_004: DiscRule = {
  ruleCode: 'IDEA_DISC_004',
  evaluate(ctx) {
    const totalDays = ctx.schoolYearCases.reduce(
      (sum, c) => sum + c.removalDays,
      0,
    );

    // Only applies when cumulative removal exceeds 10 days
    if (totalDays <= 10) {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'ERROR',
        legalReference: '34 CFR §300.530(d)',
        message: `${totalDays} cumulative days — services continuation not yet required.`,
      };
    }

    return {
      ruleCode: this.ruleCode,
      passed: ctx.servicesDocumented,
      severity: 'ERROR',
      legalReference: '34 CFR §300.530(d)',
      message: ctx.servicesDocumented
        ? 'Educational services continuation is documented.'
        : 'Educational services MUST continue after 10 cumulative removal days. No services documentation found.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_DISC_005 — IAES placement limit (45 school days)
// An Interim Alternative Educational Setting cannot exceed 45 school days.
// ---------------------------------------------------------------------------
export const DISC_005: DiscRule = {
  ruleCode: 'IDEA_DISC_005',
  evaluate(ctx) {
    if (ctx.disciplineCase.currentPlacement !== 'IAES') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'ERROR',
        legalReference: '34 CFR §300.530(g)',
        message: 'Student is not in an IAES — 45-day limit does not apply.',
      };
    }

    if (!ctx.disciplineCase.iaesEndDate) {
      return {
        ruleCode: this.ruleCode,
        passed: false,
        severity: 'ERROR',
        legalReference: '34 CFR §300.530(g)',
        message: 'Student is in IAES but no end date is set. Maximum 45 school days.',
      };
    }

    const startMs = new Date(ctx.disciplineCase.removalStartDate).getTime();
    const endMs = new Date(ctx.disciplineCase.iaesEndDate).getTime();
    const calendarDays = Math.ceil((endMs - startMs) / 86_400_000);
    // Approximate school days from calendar days (5/7 ratio)
    const schoolDays = Math.round(calendarDays * (5 / 7));
    const passed = schoolDays <= 45;

    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.530(g)',
      message: passed
        ? `IAES placement is approximately ${schoolDays} school days (within 45-day limit).`
        : `IAES placement is approximately ${schoolDays} school days, EXCEEDING the 45-day maximum.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const ALL_DISC_RULES: DiscRule[] = [
  DISC_001,
  DISC_002,
  DISC_003,
  DISC_004,
  DISC_005,
];
