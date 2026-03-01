/**
 * IDEA Progress Monitoring — Deterministic Validation Rules
 *
 * Six rules covering 34 CFR §300.320(a)(3) and §300.324(b)(1).
 * Each rule accepts a ProgressMonitoringContext and returns a
 * ProgressMonitoringRuleResult with pass/fail, severity, and legal citation.
 */

import type {
  ProgressMonitoringContext,
  ProgressMonitoringRuleResult,
} from '@/types/progress-monitoring';

export type PmRule = {
  ruleCode: string;
  evaluate: (ctx: ProgressMonitoringContext) => ProgressMonitoringRuleResult;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple linear regression returning slope. Returns null if < 2 data points. */
export function linearRegressionSlope(
  points: { x: number; y: number }[],
): number | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay,
  );
}

// ---------------------------------------------------------------------------
// IDEA_PM_001 — Active goal must have measurementMethod
// ---------------------------------------------------------------------------
export const PM_001: PmRule = {
  ruleCode: 'IDEA_PM_001',
  evaluate(ctx) {
    if (ctx.goal.status !== 'ACTIVE') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'CRITICAL',
        legalReference: '34 CFR §300.320(a)(3)(i)',
        message: 'Rule not applicable — goal is not ACTIVE.',
      };
    }

    const passed = ctx.goal.measurementMethod !== null;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.320(a)(3)(i)',
      message: passed
        ? 'Active goal has a measurement method defined.'
        : 'Active goal is MISSING a measurement method. IDEA requires a description of how progress will be measured.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PM_002 — Active goal must have reportingFrequency
// ---------------------------------------------------------------------------
export const PM_002: PmRule = {
  ruleCode: 'IDEA_PM_002',
  evaluate(ctx) {
    if (ctx.goal.status !== 'ACTIVE') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'CRITICAL',
        legalReference: '34 CFR §300.320(a)(3)(ii)',
        message: 'Rule not applicable — goal is not ACTIVE.',
      };
    }

    const passed = ctx.goal.reportingFrequency !== null;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.320(a)(3)(ii)',
      message: passed
        ? 'Active goal has a reporting frequency defined.'
        : 'Active goal is MISSING a reporting frequency. IDEA requires periodic reports on progress toward annual goals.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PM_003 — Entry must exist within monitoringIntervalDays
// ---------------------------------------------------------------------------
export const PM_003: PmRule = {
  ruleCode: 'IDEA_PM_003',
  evaluate(ctx) {
    if (ctx.goal.status !== 'ACTIVE') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'ERROR',
        legalReference: '34 CFR §300.320(a)(3)',
        message: 'Rule not applicable — goal is not ACTIVE.',
      };
    }

    const interval = ctx.goal.monitoringIntervalDays;
    const sorted = [...ctx.entries].sort(
      (a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime(),
    );
    const latest = sorted[0];

    if (!latest) {
      // No entries at all — fail if goal has been active longer than the interval
      const activatedAt = ctx.goal.activatedAt ?? ctx.goal.createdAt;
      const daysSinceActivation = daysBetween(activatedAt, ctx.nowDate);
      const passed = daysSinceActivation < interval;
      return {
        ruleCode: this.ruleCode,
        passed,
        severity: 'ERROR',
        legalReference: '34 CFR §300.320(a)(3)',
        message: passed
          ? `Goal activated ${daysSinceActivation} days ago — within ${interval}-day monitoring window.`
          : `No progress data recorded. Goal has been active ${daysSinceActivation} days, exceeding the ${interval}-day monitoring interval.`,
      };
    }

    const daysSinceEntry = daysBetween(latest.observationDate, ctx.nowDate);
    const passed = daysSinceEntry <= interval;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.320(a)(3)',
      message: passed
        ? `Most recent data point is ${daysSinceEntry} days old — within ${interval}-day window.`
        : `Most recent data point is ${daysSinceEntry} days old, exceeding the ${interval}-day monitoring interval.`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PM_004 — Delivered ProgressReport must exist per reporting period
// ---------------------------------------------------------------------------
export const PM_004: PmRule = {
  ruleCode: 'IDEA_PM_004',
  evaluate(ctx) {
    if (ctx.goal.status !== 'ACTIVE') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'ERROR',
        legalReference: '34 CFR §300.320(a)(3)(ii)',
        message: 'Rule not applicable — goal is not ACTIVE.',
      };
    }

    if (!ctx.goal.reportingFrequency) {
      return {
        ruleCode: this.ruleCode,
        passed: false,
        severity: 'ERROR',
        legalReference: '34 CFR §300.320(a)(3)(ii)',
        message: 'Cannot verify report delivery — no reporting frequency set on goal.',
      };
    }

    // Check that the most recent reporting period has a delivered report
    const deliveredReports = ctx.reports.filter(
      (r) => r.deliveryStatus === 'DELIVERED' || r.deliveryStatus === 'ACKNOWLEDGED',
    );

    if (deliveredReports.length === 0) {
      // Only fail if enough time has passed for a report to be due
      const activatedAt = ctx.goal.activatedAt ?? ctx.goal.createdAt;
      const daysSinceActivation = daysBetween(activatedAt, ctx.nowDate);
      const reportingDays = reportingFrequencyToDays(ctx.goal.reportingFrequency);
      const passed = daysSinceActivation < reportingDays;
      return {
        ruleCode: this.ruleCode,
        passed,
        severity: 'ERROR',
        legalReference: '34 CFR §300.320(a)(3)(ii)',
        message: passed
          ? `Goal activated ${daysSinceActivation} days ago — first report not yet due (${reportingDays}-day cycle).`
          : `No delivered progress reports. Goal has been active ${daysSinceActivation} days — at least one report should have been delivered.`,
      };
    }

    // Check if the latest delivered report's period end is recent enough
    const latestReport = deliveredReports.sort(
      (a, b) => new Date(b.reportingPeriodEnd).getTime() - new Date(a.reportingPeriodEnd).getTime(),
    )[0];
    const reportingDays = reportingFrequencyToDays(ctx.goal.reportingFrequency);
    const daysSinceReportEnd = daysBetween(latestReport.reportingPeriodEnd, ctx.nowDate);
    const passed = daysSinceReportEnd <= reportingDays;

    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.320(a)(3)(ii)',
      message: passed
        ? `Latest delivered report covers period ending ${latestReport.reportingPeriodEnd} — within reporting cycle.`
        : `Latest delivered report ended ${daysSinceReportEnd} days ago, exceeding the ${reportingDays}-day reporting cycle.`,
    };
  },
};

function reportingFrequencyToDays(freq: string): number {
  switch (freq) {
    case 'WEEKLY': return 7;
    case 'BIWEEKLY': return 14;
    case 'MONTHLY': return 30;
    case 'QUARTERLY': return 90;
    case 'TRIMESTER': return 120;
    case 'SEMESTER': return 180;
    default: return 30;
  }
}

// ---------------------------------------------------------------------------
// IDEA_PM_005 — Lack of progress detection (slope ≤ 0 with ≥ 3 entries)
// ---------------------------------------------------------------------------
export const PM_005: PmRule = {
  ruleCode: 'IDEA_PM_005',
  evaluate(ctx) {
    if (ctx.goal.status !== 'ACTIVE') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'WARNING',
        legalReference: '34 CFR §300.324(b)(1)(ii)(A)',
        message: 'Rule not applicable — goal is not ACTIVE.',
      };
    }

    if (ctx.entries.length < 3) {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'WARNING',
        legalReference: '34 CFR §300.324(b)(1)(ii)(A)',
        message: `Only ${ctx.entries.length} data points — need ≥3 for trend analysis.`,
      };
    }

    const sorted = [...ctx.entries].sort(
      (a, b) => new Date(a.observationDate).getTime() - new Date(b.observationDate).getTime(),
    );
    const baseDate = new Date(sorted[0].observationDate).getTime();
    const msPerDay = 86_400_000;
    const points = sorted.map((e) => ({
      x: (new Date(e.observationDate).getTime() - baseDate) / msPerDay,
      y: e.recordedValue,
    }));

    const slope = linearRegressionSlope(points);
    const passed = slope !== null && slope > 0;

    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'WARNING',
      legalReference: '34 CFR §300.324(b)(1)(ii)(A)',
      message: passed
        ? `Positive trend detected (slope: ${slope!.toFixed(4)}).`
        : `Lack of expected progress detected (slope: ${(slope ?? 0).toFixed(4)}). IEP team should review.`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PM_006 — Recommend IEP team review when PM_005 fails + 60+ active days
// ---------------------------------------------------------------------------
export const PM_006: PmRule = {
  ruleCode: 'IDEA_PM_006',
  evaluate(ctx) {
    if (ctx.goal.status !== 'ACTIVE') {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'WARNING',
        legalReference: '34 CFR §300.324(b)(1)',
        message: 'Rule not applicable — goal is not ACTIVE.',
      };
    }

    // Check PM_005 first
    const pm005Result = PM_005.evaluate(ctx);
    if (pm005Result.passed) {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'WARNING',
        legalReference: '34 CFR §300.324(b)(1)',
        message: 'Progress trend is positive — no IEP team review needed.',
      };
    }

    // Check if goal has been active 60+ days
    const activatedAt = ctx.goal.activatedAt ?? ctx.goal.createdAt;
    const daysActive = daysBetween(activatedAt, ctx.nowDate);
    if (daysActive < 60) {
      return {
        ruleCode: this.ruleCode,
        passed: true,
        severity: 'WARNING',
        legalReference: '34 CFR §300.324(b)(1)',
        message: `Goal active only ${daysActive} days — below 60-day review threshold.`,
      };
    }

    return {
      ruleCode: this.ruleCode,
      passed: false,
      severity: 'WARNING',
      legalReference: '34 CFR §300.324(b)(1)',
      message: `Lack of progress for ${daysActive} days (≥60). IDEA recommends the IEP team review and revise the IEP as appropriate.`,
    };
  },
};

export const ALL_PM_RULES: PmRule[] = [PM_001, PM_002, PM_003, PM_004, PM_005, PM_006];
