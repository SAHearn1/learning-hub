import { describe, it, expect } from 'vitest';
import { PM_001, PM_002, PM_003, PM_004, PM_005, PM_006, linearRegressionSlope } from '../pm-rules';
import type {
  ProgressMonitoringContext,
  IepGoal,
  GoalProgressEntry,
  ProgressReport,
} from '@/types/progress-monitoring';

function makeGoal(overrides: Partial<IepGoal> = {}): IepGoal {
  return {
    id: 'goal-1',
    tenantId: 'tenant-1',
    studentId: 'student-1',
    goalCode: 'MATH-001',
    description: 'Student will solve 2-digit addition problems.',
    baselineValue: 30,
    baselineDate: '2025-09-01T00:00:00Z',
    targetValue: 80,
    targetDate: '2026-06-01T00:00:00Z',
    measurementMethod: 'CURRICULUM_BASED',
    measurementUnit: 'percent correct',
    reportingFrequency: 'MONTHLY',
    monitoringIntervalDays: 30,
    status: 'ACTIVE',
    activatedAt: '2025-09-01T00:00:00Z',
    completedAt: null,
    createdBy: 'user-1',
    createdAt: '2025-09-01T00:00:00Z',
    updatedAt: '2025-09-01T00:00:00Z',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<GoalProgressEntry> = {}): GoalProgressEntry {
  return {
    id: 'entry-1',
    tenantId: 'tenant-1',
    goalId: 'goal-1',
    studentId: 'student-1',
    recordedValue: 45,
    measurementMethod: 'CURRICULUM_BASED',
    observationDate: '2025-10-01T00:00:00Z',
    notes: null,
    entryHash: 'abc123',
    recordedBy: 'user-1',
    createdAt: '2025-10-01T00:00:00Z',
    ...overrides,
  };
}

function makeReport(overrides: Partial<ProgressReport> = {}): ProgressReport {
  return {
    id: 'report-1',
    tenantId: 'tenant-1',
    goalId: 'goal-1',
    studentId: 'student-1',
    reportingPeriodStart: '2025-09-01T00:00:00Z',
    reportingPeriodEnd: '2025-09-30T00:00:00Z',
    entryCount: 3,
    currentValue: 50,
    baselineValue: 30,
    targetValue: 80,
    trendDirection: 'IMPROVING',
    trendSlope: 0.5,
    reportContent: '<html>...</html>',
    reportHash: 'hash123',
    artifactRef: 'pm-report://tenant-1/goal-1/hash123',
    deliveryStatus: 'DELIVERED',
    deliveredAt: '2025-10-05T00:00:00Z',
    acknowledgedAt: null,
    acknowledgedBy: null,
    generatedBy: 'user-1',
    createdAt: '2025-10-05T00:00:00Z',
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ProgressMonitoringContext> = {}): ProgressMonitoringContext {
  return {
    goal: makeGoal(),
    entries: [],
    reports: [],
    nowDate: '2025-10-15T00:00:00Z',
    ...overrides,
  };
}

// ===================================================================
// linearRegressionSlope helper
// ===================================================================
describe('linearRegressionSlope', () => {
  it('returns null for fewer than 2 data points', () => {
    expect(linearRegressionSlope([])).toBeNull();
    expect(linearRegressionSlope([{ x: 0, y: 5 }])).toBeNull();
  });

  it('returns positive slope for increasing data', () => {
    const slope = linearRegressionSlope([
      { x: 0, y: 30 },
      { x: 7, y: 40 },
      { x: 14, y: 50 },
    ]);
    expect(slope).toBeGreaterThan(0);
  });

  it('returns negative slope for decreasing data', () => {
    const slope = linearRegressionSlope([
      { x: 0, y: 50 },
      { x: 7, y: 40 },
      { x: 14, y: 30 },
    ]);
    expect(slope).toBeLessThan(0);
  });

  it('returns zero for flat data', () => {
    const slope = linearRegressionSlope([
      { x: 0, y: 50 },
      { x: 7, y: 50 },
      { x: 14, y: 50 },
    ]);
    expect(slope).toBe(0);
  });
});

// ===================================================================
// PM_001 — Active goal must have measurementMethod
// ===================================================================
describe('PM_001 — Measurement Method', () => {
  it('passes when active goal has measurementMethod', () => {
    const result = PM_001.evaluate(makeCtx());
    expect(result.passed).toBe(true);
    expect(result.ruleCode).toBe('IDEA_PM_001');
  });

  it('fails when active goal has null measurementMethod', () => {
    const result = PM_001.evaluate(
      makeCtx({ goal: makeGoal({ measurementMethod: null }) }),
    );
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('passes (N/A) when goal is not ACTIVE', () => {
    const result = PM_001.evaluate(
      makeCtx({ goal: makeGoal({ status: 'DRAFT' }) }),
    );
    expect(result.passed).toBe(true);
  });

  it('passes for completed goal regardless of method', () => {
    const result = PM_001.evaluate(
      makeCtx({ goal: makeGoal({ status: 'COMPLETED', measurementMethod: null }) }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PM_002 — Active goal must have reportingFrequency
// ===================================================================
describe('PM_002 — Reporting Frequency', () => {
  it('passes when active goal has reportingFrequency', () => {
    const result = PM_002.evaluate(makeCtx());
    expect(result.passed).toBe(true);
    expect(result.ruleCode).toBe('IDEA_PM_002');
  });

  it('fails when active goal has null reportingFrequency', () => {
    const result = PM_002.evaluate(
      makeCtx({ goal: makeGoal({ reportingFrequency: null }) }),
    );
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('passes when goal is DRAFT', () => {
    const result = PM_002.evaluate(
      makeCtx({ goal: makeGoal({ status: 'DRAFT', reportingFrequency: null }) }),
    );
    expect(result.passed).toBe(true);
  });

  it('includes legal reference', () => {
    const result = PM_002.evaluate(makeCtx());
    expect(result.legalReference).toBe('34 CFR §300.320(a)(3)(ii)');
  });
});

// ===================================================================
// PM_003 — Data entry within monitoring interval
// ===================================================================
describe('PM_003 — Monitoring Interval', () => {
  it('passes when recent entry exists within interval', () => {
    const result = PM_003.evaluate(
      makeCtx({
        entries: [makeEntry({ observationDate: '2025-10-10T00:00:00Z' })],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when latest entry is older than interval', () => {
    const result = PM_003.evaluate(
      makeCtx({
        goal: makeGoal({ monitoringIntervalDays: 14 }),
        entries: [makeEntry({ observationDate: '2025-09-15T00:00:00Z' })],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('ERROR');
  });

  it('passes with no entries if goal was recently activated', () => {
    const result = PM_003.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-10-10T00:00:00Z' }),
        entries: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails with no entries if goal has been active past interval', () => {
    const result = PM_003.evaluate(
      makeCtx({
        goal: makeGoal({
          activatedAt: '2025-08-01T00:00:00Z',
          monitoringIntervalDays: 30,
        }),
        entries: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('skips for non-ACTIVE goals', () => {
    const result = PM_003.evaluate(
      makeCtx({ goal: makeGoal({ status: 'DISCONTINUED' }) }),
    );
    expect(result.passed).toBe(true);
  });

  it('uses createdAt as fallback when activatedAt is null', () => {
    const result = PM_003.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: null, createdAt: '2025-10-14T00:00:00Z' }),
        entries: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PM_004 — Report delivery per reporting period
// ===================================================================
describe('PM_004 — Report Delivery', () => {
  it('passes when delivered report covers recent period', () => {
    const result = PM_004.evaluate(
      makeCtx({
        reports: [makeReport({ reportingPeriodEnd: '2025-09-30T00:00:00Z' })],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when latest report period is too old', () => {
    const result = PM_004.evaluate(
      makeCtx({
        reports: [makeReport({ reportingPeriodEnd: '2025-07-31T00:00:00Z' })],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('passes when goal is too new for first report', () => {
    const result = PM_004.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-10-10T00:00:00Z', reportingFrequency: 'MONTHLY' }),
        reports: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when no reports and goal active past cycle', () => {
    const result = PM_004.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-08-01T00:00:00Z', reportingFrequency: 'MONTHLY' }),
        reports: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('fails when reportingFrequency is null', () => {
    const result = PM_004.evaluate(
      makeCtx({
        goal: makeGoal({ reportingFrequency: null }),
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('ignores non-delivered reports (GENERATED)', () => {
    const result = PM_004.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-08-01T00:00:00Z' }),
        reports: [makeReport({ deliveryStatus: 'GENERATED' })],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('counts ACKNOWLEDGED as delivered', () => {
    const result = PM_004.evaluate(
      makeCtx({
        reports: [
          makeReport({
            deliveryStatus: 'ACKNOWLEDGED',
            reportingPeriodEnd: '2025-09-30T00:00:00Z',
          }),
        ],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('skips for non-ACTIVE goals', () => {
    const result = PM_004.evaluate(
      makeCtx({ goal: makeGoal({ status: 'COMPLETED' }) }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PM_005 — Lack of progress detection
// ===================================================================
describe('PM_005 — Trend Analysis', () => {
  it('passes with positive trend', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 35, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 45, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 55, observationDate: '2025-10-15T00:00:00Z' }),
    ];
    const result = PM_005.evaluate(makeCtx({ entries }));
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('WARNING');
  });

  it('fails with flat/declining trend (3+ entries)', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 50, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 45, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 40, observationDate: '2025-10-15T00:00:00Z' }),
    ];
    const result = PM_005.evaluate(makeCtx({ entries }));
    expect(result.passed).toBe(false);
  });

  it('passes with fewer than 3 entries (insufficient data)', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 30, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 25, observationDate: '2025-10-01T00:00:00Z' }),
    ];
    const result = PM_005.evaluate(makeCtx({ entries }));
    expect(result.passed).toBe(true);
  });

  it('passes with no entries', () => {
    const result = PM_005.evaluate(makeCtx({ entries: [] }));
    expect(result.passed).toBe(true);
  });

  it('fails with flat data (slope = 0)', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 50, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 50, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 50, observationDate: '2025-10-15T00:00:00Z' }),
    ];
    const result = PM_005.evaluate(makeCtx({ entries }));
    expect(result.passed).toBe(false);
  });

  it('skips for non-ACTIVE goals', () => {
    const result = PM_005.evaluate(
      makeCtx({ goal: makeGoal({ status: 'DRAFT' }) }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PM_006 — IEP Team Review Recommendation
// ===================================================================
describe('PM_006 — IEP Review Recommendation', () => {
  it('passes when PM_005 passes (positive trend)', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 35, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 45, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 55, observationDate: '2025-10-15T00:00:00Z' }),
    ];
    const result = PM_006.evaluate(makeCtx({ entries }));
    expect(result.passed).toBe(true);
  });

  it('passes when declining but active < 60 days', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 50, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 40, observationDate: '2025-09-25T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 30, observationDate: '2025-10-05T00:00:00Z' }),
    ];
    const result = PM_006.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-09-10T00:00:00Z' }),
        entries,
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when declining AND active 60+ days', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 50, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 40, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 30, observationDate: '2025-10-15T00:00:00Z' }),
    ];
    const result = PM_006.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-08-01T00:00:00Z' }),
        entries,
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('WARNING');
    expect(result.legalReference).toBe('34 CFR §300.324(b)(1)');
  });

  it('skips for non-ACTIVE goals', () => {
    const result = PM_006.evaluate(
      makeCtx({ goal: makeGoal({ status: 'COMPLETED' }) }),
    );
    expect(result.passed).toBe(true);
  });

  it('uses createdAt as fallback when activatedAt is null for day calculation', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 50, observationDate: '2025-08-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 45, observationDate: '2025-09-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 40, observationDate: '2025-10-01T00:00:00Z' }),
    ];
    const result = PM_006.evaluate(
      makeCtx({
        goal: makeGoal({ activatedAt: null, createdAt: '2025-08-01T00:00:00Z' }),
        entries,
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
  });
});
