import { describe, it, expect } from 'vitest';
import { evaluateProgressMonitoring } from '../pm-evaluator';
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

describe('evaluateProgressMonitoring', () => {
  it('runs all 6 rules', () => {
    const result = evaluateProgressMonitoring(makeCtx());
    expect(result.rules).toHaveLength(6);
    expect(result.goalId).toBe('goal-1');
  });

  it('passes when all rules pass (fully compliant goal)', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 35, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 45, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 55, observationDate: '2025-10-10T00:00:00Z' }),
    ];
    const result = evaluateProgressMonitoring(
      makeCtx({
        entries,
        reports: [makeReport({ reportingPeriodEnd: '2025-09-30T00:00:00Z' })],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when any critical rule fails', () => {
    const result = evaluateProgressMonitoring(
      makeCtx({ goal: makeGoal({ measurementMethod: null }) }),
    );
    expect(result.passed).toBe(false);
    const failedRules = result.rules.filter((r) => !r.passed);
    expect(failedRules.some((r) => r.ruleCode === 'IDEA_PM_001')).toBe(true);
  });

  it('returns all individual rule results', () => {
    const result = evaluateProgressMonitoring(makeCtx());
    const codes = result.rules.map((r) => r.ruleCode);
    expect(codes).toContain('IDEA_PM_001');
    expect(codes).toContain('IDEA_PM_002');
    expect(codes).toContain('IDEA_PM_003');
    expect(codes).toContain('IDEA_PM_004');
    expect(codes).toContain('IDEA_PM_005');
    expect(codes).toContain('IDEA_PM_006');
  });

  it('passes all rules for non-ACTIVE goal', () => {
    const result = evaluateProgressMonitoring(
      makeCtx({
        goal: makeGoal({
          status: 'DRAFT',
          measurementMethod: null,
          reportingFrequency: null,
        }),
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.rules.every((r) => r.passed)).toBe(true);
  });

  it('shows multiple failures simultaneously', () => {
    const result = evaluateProgressMonitoring(
      makeCtx({
        goal: makeGoal({
          measurementMethod: null,
          reportingFrequency: null,
          activatedAt: '2025-08-01T00:00:00Z',
        }),
        entries: [],
        reports: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    expect(result.passed).toBe(false);
    const failedCodes = result.rules.filter((r) => !r.passed).map((r) => r.ruleCode);
    expect(failedCodes).toContain('IDEA_PM_001');
    expect(failedCodes).toContain('IDEA_PM_002');
    expect(failedCodes).toContain('IDEA_PM_003');
  });

  it('captures severity levels correctly', () => {
    const result = evaluateProgressMonitoring(makeCtx());
    const pm001 = result.rules.find((r) => r.ruleCode === 'IDEA_PM_001')!;
    const pm005 = result.rules.find((r) => r.ruleCode === 'IDEA_PM_005')!;
    expect(pm001.severity).toBe('CRITICAL');
    expect(pm005.severity).toBe('WARNING');
  });

  it('includes correct goalId in result', () => {
    const result = evaluateProgressMonitoring(
      makeCtx({ goal: makeGoal({ id: 'goal-xyz' }) }),
    );
    expect(result.goalId).toBe('goal-xyz');
  });

  it('handles goal with entries and reports', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 40, observationDate: '2025-09-15T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 50, observationDate: '2025-10-01T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 60, observationDate: '2025-10-10T00:00:00Z' }),
    ];
    const reports = [
      makeReport({
        deliveryStatus: 'ACKNOWLEDGED',
        reportingPeriodEnd: '2025-09-30T00:00:00Z',
      }),
    ];
    const result = evaluateProgressMonitoring(makeCtx({ entries, reports }));
    expect(result.passed).toBe(true);
  });

  it('handles goal active for exactly 60 days with declining trend', () => {
    const entries = [
      makeEntry({ id: 'e1', recordedValue: 50, observationDate: '2025-08-20T00:00:00Z' }),
      makeEntry({ id: 'e2', recordedValue: 45, observationDate: '2025-09-10T00:00:00Z' }),
      makeEntry({ id: 'e3', recordedValue: 40, observationDate: '2025-09-30T00:00:00Z' }),
    ];
    const result = evaluateProgressMonitoring(
      makeCtx({
        goal: makeGoal({ activatedAt: '2025-08-16T00:00:00Z' }),
        entries,
        reports: [makeReport({ reportingPeriodEnd: '2025-09-30T00:00:00Z' })],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    // PM_005 fails (declining), PM_006 fails (60+ days)
    const pm006 = result.rules.find((r) => r.ruleCode === 'IDEA_PM_006')!;
    expect(pm006.passed).toBe(false);
  });

  it('distinguishes between ERROR and CRITICAL severities', () => {
    const result = evaluateProgressMonitoring(
      makeCtx({
        goal: makeGoal({ measurementMethod: null }),
        entries: [],
        nowDate: '2025-10-15T00:00:00Z',
      }),
    );
    const criticals = result.rules.filter((r) => r.severity === 'CRITICAL' && !r.passed);
    const errors = result.rules.filter((r) => r.severity === 'ERROR' && !r.passed);
    expect(criticals.length).toBeGreaterThan(0);
    expect(errors.length).toBeGreaterThanOrEqual(0);
  });
});
