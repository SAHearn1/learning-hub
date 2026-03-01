import { describe, it, expect } from 'vitest';
import { evaluateProceduralSafeguards } from '../psn-evaluator';
import type { ProceduralSafeguardsContext, SafeguardsNotice, ProceduralEvent } from '@/types/safeguards';

function makeNotice(overrides: Partial<SafeguardsNotice> = {}): SafeguardsNotice {
  return {
    id: 'notice-1',
    tenantId: 'tenant-1',
    studentId: 'student-1',
    caseId: null,
    proceduralEventId: 'event-1',
    trigger: 'ANNUAL_NOTICE',
    deliveryMethod: 'PORTAL',
    deliveryStatus: 'DELIVERED',
    deliveredAt: '2025-09-15T00:00:00Z',
    acknowledgedAt: null,
    acknowledgedBy: null,
    noticeDocHash: 'abc123',
    artifactRef: 'psn://tenant-1/student-1/abc123',
    schoolYear: '2025-2026',
    createdAt: '2025-09-15T00:00:00Z',
    ...overrides,
  };
}

describe('evaluateProceduralSafeguards', () => {
  it('fails for annual trigger with no notices', () => {
    const result = evaluateProceduralSafeguards({
      trigger: 'ANNUAL_NOTICE',
      studentId: 'student-1',
      schoolYear: '2025-2026',
      existingNotices: [],
      existingEvents: [],
    });
    expect(result.passed).toBe(false);
    expect(result.trigger).toBe('ANNUAL_NOTICE');
    expect(result.rules.length).toBeGreaterThanOrEqual(1);
    expect(result.rules[0].ruleCode).toBe('IDEA_PSN_001');
  });

  it('passes for annual trigger with delivered notice', () => {
    const result = evaluateProceduralSafeguards({
      trigger: 'ANNUAL_NOTICE',
      studentId: 'student-1',
      schoolYear: '2025-2026',
      existingNotices: [makeNotice()],
      existingEvents: [],
    });
    expect(result.passed).toBe(true);
  });

  it('includes both annual and trigger-specific rules for non-annual triggers', () => {
    const result = evaluateProceduralSafeguards({
      trigger: 'PARENT_REQUEST',
      studentId: 'student-1',
      schoolYear: '2025-2026',
      proceduralEventId: 'event-1',
      existingNotices: [
        makeNotice(),
        makeNotice({
          id: 'notice-2',
          proceduralEventId: 'event-1',
          trigger: 'PARENT_REQUEST',
        }),
      ],
      existingEvents: [],
    });
    expect(result.passed).toBe(true);
    // Should have both PSN_001 (annual) and PSN_006 (parent request)
    const ruleCodes = result.rules.map((r) => r.ruleCode);
    expect(ruleCodes).toContain('IDEA_PSN_001');
    expect(ruleCodes).toContain('IDEA_PSN_006');
  });

  it('fails when annual passes but trigger-specific fails', () => {
    const result = evaluateProceduralSafeguards({
      trigger: 'PARENT_REQUEST',
      studentId: 'student-1',
      schoolYear: '2025-2026',
      proceduralEventId: 'event-parent-req', // different from annual notice event
      existingNotices: [makeNotice({ proceduralEventId: 'event-annual' })], // annual passes
      existingEvents: [],
    });
    expect(result.passed).toBe(false);
    const annual = result.rules.find((r) => r.ruleCode === 'IDEA_PSN_001');
    const parentReq = result.rules.find((r) => r.ruleCode === 'IDEA_PSN_006');
    expect(annual?.passed).toBe(true);
    expect(parentReq?.passed).toBe(false);
  });

  it('does not duplicate PSN_001 when trigger is ANNUAL_NOTICE', () => {
    const result = evaluateProceduralSafeguards({
      trigger: 'ANNUAL_NOTICE',
      studentId: 'student-1',
      schoolYear: '2025-2026',
      existingNotices: [],
      existingEvents: [],
    });
    const psn001Count = result.rules.filter((r) => r.ruleCode === 'IDEA_PSN_001').length;
    expect(psn001Count).toBe(1);
  });
});
