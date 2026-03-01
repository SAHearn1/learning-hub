import { describe, it, expect } from 'vitest';
import {
  DISC_001,
  DISC_002,
  DISC_003,
  DISC_004,
  DISC_005,
  ALL_DISC_RULES,
} from '../disc-rules';
import type { DisciplineContext, DisciplineCase } from '@/types/discipline';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    incidentDescription: 'Physical altercation in hallway.',
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

// ─── DISC_001 — 10-day cumulative removal threshold ────────────────────────

describe('IDEA_DISC_001 — 10-day removal threshold', () => {
  it('passes when cumulative days <= 10', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 5 }), makeCase({ removalDays: 4 })],
    });
    const result = DISC_001.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('9 cumulative');
  });

  it('passes at exactly 10 days', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 10 })],
    });
    expect(DISC_001.evaluate(ctx).passed).toBe(true);
  });

  it('fails when cumulative days > 10', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 7 }), makeCase({ removalDays: 5 })],
    });
    const result = DISC_001.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
    expect(result.message).toContain('12 cumulative');
  });

  it('passes with zero school year cases', () => {
    const ctx = makeCtx({ schoolYearCases: [] });
    expect(DISC_001.evaluate(ctx).passed).toBe(true);
  });
});

// ─── DISC_002 — MDR required ──────────────────────────────────────────────

describe('IDEA_DISC_002 — Manifestation Determination required', () => {
  it('auto-passes when not a change of placement', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ isChangeOfPlacement: false }),
    });
    const result = DISC_002.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('Not a change of placement');
  });

  it('passes when MDR exists for change of placement', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ isChangeOfPlacement: true }),
      manifestDetermination: {
        id: 'mdr-1', tenantId: 'tenant-1', caseId: 'dc-1',
        meetingDate: '2025-10-05T00:00:00Z',
        attendees: [{ name: 'Parent', role: 'PARENT' }],
        outcome: 'NOT_MANIFESTATION', rationale: 'Test',
        conductRelated: false, disabilityRelated: false, iepImplemented: true,
        documentHash: 'h1', artifactRef: 'a1', decidedBy: 'user-1',
        createdAt: '2025-10-05T00:00:00Z',
      },
    });
    expect(DISC_002.evaluate(ctx).passed).toBe(true);
  });

  it('fails when no MDR for change of placement', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ isChangeOfPlacement: true }),
      manifestDetermination: null,
    });
    const result = DISC_002.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });
});

// ─── DISC_003 — PSN at change of placement ────────────────────────────────

describe('IDEA_DISC_003 — PSN at change of placement', () => {
  it('auto-passes when not a change of placement', () => {
    const ctx = makeCtx();
    expect(DISC_003.evaluate(ctx).passed).toBe(true);
  });

  it('passes when PSN delivered', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ isChangeOfPlacement: true }),
      psnDelivered: true,
    });
    expect(DISC_003.evaluate(ctx).passed).toBe(true);
  });

  it('fails when PSN not delivered', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ isChangeOfPlacement: true }),
      psnDelivered: false,
    });
    const result = DISC_003.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });
});

// ─── DISC_004 — Services continue during discipline ──────────────────────

describe('IDEA_DISC_004 — Services continue during discipline', () => {
  it('auto-passes when cumulative days <= 10', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 5 })],
    });
    expect(DISC_004.evaluate(ctx).passed).toBe(true);
  });

  it('passes when services documented and days > 10', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 12 })],
      servicesDocumented: true,
    });
    expect(DISC_004.evaluate(ctx).passed).toBe(true);
  });

  it('fails when services not documented and days > 10', () => {
    const ctx = makeCtx({
      schoolYearCases: [makeCase({ removalDays: 12 })],
      servicesDocumented: false,
    });
    const result = DISC_004.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('ERROR');
  });
});

// ─── DISC_005 — IAES 45 school day limit ──────────────────────────────────

describe('IDEA_DISC_005 — IAES 45 school day limit', () => {
  it('auto-passes when not in IAES', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ currentPlacement: 'RETURN_TO_PLACEMENT' }),
    });
    expect(DISC_005.evaluate(ctx).passed).toBe(true);
  });

  it('auto-passes when placement is null', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({ currentPlacement: null }),
    });
    expect(DISC_005.evaluate(ctx).passed).toBe(true);
  });

  it('fails when IAES has no end date', () => {
    const ctx = makeCtx({
      disciplineCase: makeCase({
        currentPlacement: 'IAES',
        iaesEndDate: null,
      }),
    });
    const result = DISC_005.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('no end date');
  });

  it('passes when IAES is within 45 school days', () => {
    // 30 calendar days ≈ 21 school days
    const ctx = makeCtx({
      disciplineCase: makeCase({
        currentPlacement: 'IAES',
        removalStartDate: '2025-10-01T00:00:00Z',
        iaesEndDate: '2025-10-31T00:00:00Z',
      }),
    });
    expect(DISC_005.evaluate(ctx).passed).toBe(true);
  });

  it('fails when IAES exceeds 45 school days', () => {
    // 90 calendar days ≈ 64 school days
    const ctx = makeCtx({
      disciplineCase: makeCase({
        currentPlacement: 'IAES',
        removalStartDate: '2025-10-01T00:00:00Z',
        iaesEndDate: '2025-12-30T00:00:00Z',
      }),
    });
    const result = DISC_005.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('EXCEEDING');
  });
});

// ─── ALL_DISC_RULES ───────────────────────────────────────────────────────

describe('ALL_DISC_RULES registry', () => {
  it('contains exactly 5 rules', () => {
    expect(ALL_DISC_RULES).toHaveLength(5);
  });

  it('has unique rule codes', () => {
    const codes = ALL_DISC_RULES.map((r) => r.ruleCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
