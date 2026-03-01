import { describe, it, expect } from 'vitest';
import {
  checkAiFence,
  checkAiFenceBatch,
  getAiWritableFields,
  isImmutableResource,
} from '../compliance-fence';
import type { ComplianceSnapshot } from '@/lib/compliance-dashboard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSnapshot(
  overrides: Partial<ComplianceSnapshot> = {},
): ComplianceSnapshot {
  return {
    tenantId: 'tenant-1',
    schoolYear: '2025-07-01/2026-06-30',
    generatedAt: '2025-10-01T00:00:00Z',
    safeguards: {
      totalNotices: 5, delivered: 4, pending: 1, acknowledged: 0,
    },
    progressMonitoring: {
      totalGoals: 10, activeGoals: 8,
      missingMeasurementMethod: 0, missingReportingFrequency: 0,
    },
    evaluations: {
      totalCases: 3, openCases: 2, overdueCases: 0,
      awaitingConsent: 0, missingPlan: 0,
    },
    discipline: {
      totalRemovals: 1, openCases: 1,
      changeOfPlacement: 0, pendingMdr: 0,
    },
    riskScore: 5,
    riskLevel: 'LOW',
    ...overrides,
  };
}

// ─── checkAiFence ────────────────────────────────────────────────────────────

describe('checkAiFence', () => {
  it('allows writing to a narrative field', () => {
    const result = checkAiFence(
      { resource: 'DisciplineCase', field: 'incidentDescription', value: 'Updated text' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(true);
  });

  it('allows writing to rationale field', () => {
    const result = checkAiFence(
      { resource: 'EligibilityDecision', field: 'rationale', value: 'New rationale' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(true);
  });

  it('blocks writing to procedural state field', () => {
    const result = checkAiFence(
      { resource: 'EvaluationCase', field: 'currentState', value: 'CLOSED' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('procedural state');
  });

  it('blocks writing to status field', () => {
    const result = checkAiFence(
      { resource: 'IepGoal', field: 'status', value: 'COMPLETED' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(false);
  });

  it('blocks writing to outcome field', () => {
    const result = checkAiFence(
      { resource: 'ManifestDetermination', field: 'outcome', value: 'IS_MANIFESTATION' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(false);
  });

  it('blocks updates to immutable resources', () => {
    const result = checkAiFence(
      {
        resource: 'EvalStateTransition',
        field: 'notes',
        value: 'Updated',
        resourceId: 'transition-1',
      },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('immutable');
  });

  it('allows new records on immutable resources (no resourceId)', () => {
    const result = checkAiFence(
      { resource: 'GoalProgressEntry', field: 'notes', value: 'New note' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(true);
  });

  it('blocks writing to non-writable field', () => {
    const result = checkAiFence(
      { resource: 'DisciplineCase', field: 'removalDays', value: '5' },
      makeSnapshot(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in the AI-writable field list');
  });

  it('blocks all writes when risk is CRITICAL', () => {
    const snapshot = makeSnapshot({ riskScore: 80, riskLevel: 'CRITICAL' });
    const result = checkAiFence(
      { resource: 'DisciplineCase', field: 'incidentDescription', value: 'Text' },
      snapshot,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('CRITICAL');
  });

  it('allows writes when risk is HIGH', () => {
    const snapshot = makeSnapshot({ riskScore: 40, riskLevel: 'HIGH' });
    const result = checkAiFence(
      { resource: 'DisciplineCase', field: 'incidentDescription', value: 'Text' },
      snapshot,
    );
    expect(result.allowed).toBe(true);
  });
});

// ─── checkAiFenceBatch ──────────────────────────────────────────────────────

describe('checkAiFenceBatch', () => {
  it('returns results for each request', () => {
    const requests = [
      { resource: 'DisciplineCase', field: 'incidentDescription', value: 'A' },
      { resource: 'DisciplineCase', field: 'currentState', value: 'CLOSED' },
    ];
    const results = checkAiFenceBatch(requests, makeSnapshot());
    expect(results).toHaveLength(2);
    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(false);
  });
});

// ─── getAiWritableFields ────────────────────────────────────────────────────

describe('getAiWritableFields', () => {
  it('returns an array of writable field names', () => {
    const fields = getAiWritableFields();
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContain('incidentDescription');
    expect(fields).toContain('rationale');
    expect(fields).toContain('narrative');
  });

  it('does not include procedural fields', () => {
    const fields = getAiWritableFields();
    expect(fields).not.toContain('currentState');
    expect(fields).not.toContain('status');
    expect(fields).not.toContain('outcome');
  });
});

// ─── isImmutableResource ────────────────────────────────────────────────────

describe('isImmutableResource', () => {
  it('returns true for immutable resources', () => {
    expect(isImmutableResource('AuditLog')).toBe(true);
    expect(isImmutableResource('EvalStateTransition')).toBe(true);
    expect(isImmutableResource('GoalProgressEntry')).toBe(true);
    expect(isImmutableResource('ManifestDetermination')).toBe(true);
  });

  it('returns false for mutable resources', () => {
    expect(isImmutableResource('DisciplineCase')).toBe(false);
    expect(isImmutableResource('EvaluationCase')).toBe(false);
    expect(isImmutableResource('IepGoal')).toBe(false);
  });
});
