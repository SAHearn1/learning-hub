import { describe, it, expect } from 'vitest';
import { PSN_001, PSN_002, PSN_003, PSN_004, PSN_005, PSN_006 } from '../psn-rules';
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

function makeEvent(overrides: Partial<ProceduralEvent> = {}): ProceduralEvent {
  return {
    id: 'event-1',
    tenantId: 'tenant-1',
    studentId: 'student-1',
    caseId: null,
    eventType: 'ANNUAL_NOTICE_DUE',
    trigger: 'ANNUAL_NOTICE',
    schoolYear: '2025-2026',
    correlationId: 'corr-1',
    isFirstOfType: false,
    metadata: null,
    createdBy: 'user-1',
    createdAt: '2025-09-01T00:00:00Z',
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ProceduralSafeguardsContext> = {}): ProceduralSafeguardsContext {
  return {
    trigger: 'ANNUAL_NOTICE',
    studentId: 'student-1',
    schoolYear: '2025-2026',
    caseId: null,
    existingNotices: [],
    existingEvents: [],
    proceduralEventId: 'event-1',
    ...overrides,
  };
}

// ===================================================================
// PSN_001 — Annual Notice
// ===================================================================
describe('PSN_001 — Annual Notice', () => {
  it('fails when no delivered notice exists', () => {
    const result = PSN_001.evaluate(makeCtx());
    expect(result.passed).toBe(false);
    expect(result.ruleCode).toBe('IDEA_PSN_001');
    expect(result.severity).toBe('ERROR');
  });

  it('passes when a delivered notice exists for the school year', () => {
    const result = PSN_001.evaluate(
      makeCtx({ existingNotices: [makeNotice()] }),
    );
    expect(result.passed).toBe(true);
  });

  it('passes when an acknowledged notice exists', () => {
    const result = PSN_001.evaluate(
      makeCtx({
        existingNotices: [makeNotice({ deliveryStatus: 'ACKNOWLEDGED' })],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when notice is only PENDING', () => {
    const result = PSN_001.evaluate(
      makeCtx({
        existingNotices: [makeNotice({ deliveryStatus: 'PENDING' })],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

// ===================================================================
// PSN_002 — Initial Referral / Parent Evaluation Request
// ===================================================================
describe('PSN_002 — Initial Referral', () => {
  it('fails when no notice exists for the event', () => {
    const result = PSN_002.evaluate(
      makeCtx({ trigger: 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST' }),
    );
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('passes when a delivered notice exists for the event', () => {
    const result = PSN_002.evaluate(
      makeCtx({
        trigger: 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
        existingNotices: [
          makeNotice({
            proceduralEventId: 'event-1',
            trigger: 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
          }),
        ],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PSN_003 — First State Complaint
// ===================================================================
describe('PSN_003 — First State Complaint', () => {
  it('fails when no first-of-type event exists', () => {
    const result = PSN_003.evaluate(
      makeCtx({ trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR' }),
    );
    expect(result.passed).toBe(false);
  });

  it('passes when first-of-type event has a delivered notice', () => {
    const evt = makeEvent({
      id: 'evt-sc',
      eventType: 'STATE_COMPLAINT_FILED',
      trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
      isFirstOfType: true,
    });
    const result = PSN_003.evaluate(
      makeCtx({
        trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
        existingEvents: [evt],
        existingNotices: [makeNotice({ proceduralEventId: 'evt-sc' })],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails for second complaint (not first of type)', () => {
    const evt = makeEvent({
      id: 'evt-sc2',
      eventType: 'STATE_COMPLAINT_FILED',
      trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
      isFirstOfType: false,
    });
    const result = PSN_003.evaluate(
      makeCtx({
        trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
        existingEvents: [evt],
        existingNotices: [makeNotice({ proceduralEventId: 'evt-sc2' })],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

// ===================================================================
// PSN_004 — First Due Process Complaint
// ===================================================================
describe('PSN_004 — First Due Process Complaint', () => {
  it('fails when no first-of-type event exists', () => {
    const result = PSN_004.evaluate(
      makeCtx({ trigger: 'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR' }),
    );
    expect(result.passed).toBe(false);
  });

  it('passes when first-of-type event has a delivered notice', () => {
    const evt = makeEvent({
      id: 'evt-dp',
      eventType: 'DUE_PROCESS_COMPLAINT_FILED',
      trigger: 'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR',
      isFirstOfType: true,
    });
    const result = PSN_004.evaluate(
      makeCtx({
        trigger: 'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR',
        existingEvents: [evt],
        existingNotices: [makeNotice({ proceduralEventId: 'evt-dp' })],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PSN_005 — Disciplinary Change of Placement
// ===================================================================
describe('PSN_005 — Disciplinary Change of Placement', () => {
  it('fails when no notice exists for the event', () => {
    const result = PSN_005.evaluate(
      makeCtx({ trigger: 'DISCIPLINARY_CHANGE_OF_PLACEMENT' }),
    );
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('passes when a delivered notice exists for the event', () => {
    const result = PSN_005.evaluate(
      makeCtx({
        trigger: 'DISCIPLINARY_CHANGE_OF_PLACEMENT',
        existingNotices: [
          makeNotice({
            proceduralEventId: 'event-1',
            trigger: 'DISCIPLINARY_CHANGE_OF_PLACEMENT',
          }),
        ],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

// ===================================================================
// PSN_006 — Parent Request
// ===================================================================
describe('PSN_006 — Parent Request', () => {
  it('fails when notice is only GENERATED (not DELIVERED)', () => {
    const result = PSN_006.evaluate(
      makeCtx({
        trigger: 'PARENT_REQUEST',
        existingNotices: [
          makeNotice({
            proceduralEventId: 'event-1',
            trigger: 'PARENT_REQUEST',
            deliveryStatus: 'GENERATED',
          }),
        ],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('passes when notice is DELIVERED', () => {
    const result = PSN_006.evaluate(
      makeCtx({
        trigger: 'PARENT_REQUEST',
        existingNotices: [
          makeNotice({
            proceduralEventId: 'event-1',
            trigger: 'PARENT_REQUEST',
            deliveryStatus: 'DELIVERED',
          }),
        ],
      }),
    );
    expect(result.passed).toBe(true);
  });
});
