import { describe, it, expect } from 'vitest';
import { evaluateDisciplineCompliance } from '../disc-evaluator';
import type { DisciplineContext, DisciplineCase } from '@/types/discipline';

function makeCase(overrides: Partial<DisciplineCase> = {}): DisciplineCase {
  return {
    id: 'dc-1',
    tenantId: 'tenant-1',
    studentId: 'student-1',
    currentState: 'REMOVAL_RECORDED',
    removalType: 'OUT_OF_SCHOOL_SUSPENSION',
    removalStartDate: '2025-10-01T00:00:00Z',
    removalEndDate: '2025-10-03T00:00:00Z',
    removalDays: 3,
    cumulativeRemovalDays: 3,
    isChangeOfPlacement: false,
    currentPlacement: null,
    iaesEndDate: null,
    servicesDescription: null,
    servicesContinued: false,
    incidentDescription: 'Test incident.',
    closedDate: null,
    closedReason: null,
    metadata: null,
    createdBy: 'user-1',
    createdAt: '2025-10-01T00:00:00Z',
    updatedAt: '2025-10-01T00:00:00Z',
    ...overrides,
  };
}

function makeCtx(overrides: Partial<DisciplineContext> = {}): DisciplineContext {
  return {
    disciplineCase: makeCase(),
    manifestDetermination: null,
    schoolYearCases: [makeCase()],
    psnDelivered: false,
    servicesDocumented: false,
    nowDate: '2025-10-05T00:00:00Z',
    ...overrides,
  };
}

describe('evaluateDisciplineCompliance', () => {
  it('passes when all rules pass (low-risk case)', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 2 })],
    });
    const result = evaluateDisciplineCompliance(ctx);
    expect(result.passed).toBe(true);
    expect(result.rules).toHaveLength(5);
    expect(result.rules.every((r) => r.passed)).toBe(true);
  });

  it('fails when any rule fails', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ isChangeOfPlacement: true }),
      schoolYearCases: [makeCase({ removalDays: 15 })],
    });
    const result = evaluateDisciplineCompliance(ctx);
    expect(result.passed).toBe(false);
    const failedCodes = result.rules.filter((r) => !r.passed).map((r) => r.ruleCode);
    expect(failedCodes.length).toBeGreaterThan(0);
  });

  it('includes caseId and currentState in result', () => {
    const ctx = makeCtx();
    const result = evaluateDisciplineCompliance(ctx);
    expect(result.caseId).toBe('dc-1');
    expect(result.currentState).toBe('REMOVAL_RECORDED');
  });

  it('always returns exactly 5 rule results', () => {
    const ctx = makeCtx();
    expect(evaluateDisciplineCompliance(ctx).rules).toHaveLength(5);
  });

  it('correctly identifies multiple failures', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({
        isChangeOfPlacement: true,
        currentPlacement: 'IAES',
        iaesEndDate: null,
      }),
      schoolYearCases: [makeCase({ removalDays: 15 })],
      psnDelivered: false,
      servicesDocumented: false,
    });
    const result = evaluateDisciplineCompliance(ctx);
    const failedCount = result.rules.filter((r) => !r.passed).length;
    // DISC_001 (>10 days), DISC_002 (no MDR), DISC_003 (no PSN), DISC_004 (no services), DISC_005 (no IAES end date)
    expect(failedCount).toBe(5);
  });
});
