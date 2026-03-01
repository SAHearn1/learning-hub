import { describe, it, expect } from 'vitest';
import {
  REFERRAL_001,
  REFERRAL_002,
  EVAL_INIT_001,
  EVAL_INIT_002,
  EVAL_INIT_003,
  EVAL_INIT_004,
  EVAL_INIT_005,
  EVAL_INIT_006,
  REEVAL_001,
  DISMISS_001,
  ALL_EVAL_RULES,
} from '../eval-rules';
import type { EvalCaseContext, EvalCaseState, StateOverlay } from '@/types/evaluation';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE_OVERLAY: StateOverlay = {
  stateCode: 'US',
  stateName: 'Federal Baseline',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'CALENDAR_DAYS',
  additionalRequiredMeetingRoles: [],
};

function makeCtx(overrides: Partial<EvalCaseContext> = {}): EvalCaseContext {
  return {
    evaluationCase: {
      id: 'case-1',
      tenantId: 'tenant-1',
      studentId: 'student-1',
      caseType: 'INITIAL',
      currentState: 'EVAL_TRIGGERED',
      stateCode: 'US',
      referralSource: 'PARENT',
      referralReason: 'Concern about reading',
      referralDate: '2025-09-01',
      consentRequestedDate: null,
      consentReceivedDate: null,
      evaluationDueDate: null,
      eligibilityDate: null,
      closedDate: null,
      closedReason: null,
      correlationId: 'corr-1',
      metadata: null,
      createdBy: 'user-1',
      createdAt: '2025-09-01',
      updatedAt: '2025-09-01',
    },
    consents: [],
    plan: null,
    assignments: [],
    assessments: [],
    eligibilityMeeting: null,
    eligibilityDecision: null,
    transitions: [],
    safeguardsNotices: [],
    priorWrittenNotices: [],
    previousEvaluations: [],
    stateOverlay: BASE_OVERLAY,
    nowDate: '2025-10-01',
    ...overrides,
  };
}

function ctxWithState(state: EvalCaseState, extra: Partial<EvalCaseContext> = {}): EvalCaseContext {
  return makeCtx({
    evaluationCase: {
      ...makeCtx().evaluationCase,
      currentState: state,
    },
    ...extra,
  });
}

// ─── REFERRAL_001 — Safeguards on referral ──────────────────────────────────

describe('IDEA_REFERRAL_001 — Safeguards notice on referral', () => {
  it('passes when safeguards notice is DELIVERED', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED', {
      safeguardsNotices: [{ id: 'sn-1', deliveryStatus: 'DELIVERED', trigger: 'INITIAL_REFERRAL' }],
    });
    const result = REFERRAL_001.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('CRITICAL');
  });

  it('passes when safeguards notice is ACKNOWLEDGED', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED', {
      safeguardsNotices: [{ id: 'sn-1', deliveryStatus: 'ACKNOWLEDGED', trigger: 'INITIAL_REFERRAL' }],
    });
    expect(REFERRAL_001.evaluate(ctx).passed).toBe(true);
  });

  it('fails when no safeguards notice', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED', { safeguardsNotices: [] });
    const result = REFERRAL_001.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
    expect(result.legalReference).toBe('34 CFR §300.504(a)(1)');
  });

  it('fails when safeguards notice is only GENERATED (not delivered)', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED', {
      safeguardsNotices: [{ id: 'sn-1', deliveryStatus: 'GENERATED', trigger: 'INITIAL_REFERRAL' }],
    });
    expect(REFERRAL_001.evaluate(ctx).passed).toBe(false);
  });

  it('auto-passes when not in EVAL_TRIGGERED state', () => {
    const ctx = ctxWithState('CONSENT_REQUESTED');
    const result = REFERRAL_001.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('Not in applicable state');
  });
});

// ─── REFERRAL_002 — PWN before consent ──────────────────────────────────────

describe('IDEA_REFERRAL_002 — PWN before consent request', () => {
  it('passes when PWN exists for the case', () => {
    const ctx = ctxWithState('SAFEGUARDS_REQUIRED', {
      priorWrittenNotices: [{ id: 'pwn-1', caseId: 'case-1' }],
    });
    expect(REFERRAL_002.evaluate(ctx).passed).toBe(true);
  });

  it('fails when no PWN for the case', () => {
    const ctx = ctxWithState('SAFEGUARDS_REQUIRED', {
      priorWrittenNotices: [],
    });
    const result = REFERRAL_002.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('fails when PWN exists for a different case', () => {
    const ctx = ctxWithState('SAFEGUARDS_REQUIRED', {
      priorWrittenNotices: [{ id: 'pwn-1', caseId: 'case-other' }],
    });
    expect(REFERRAL_002.evaluate(ctx).passed).toBe(false);
  });

  it('auto-passes when not in SAFEGUARDS_REQUIRED state', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED');
    expect(REFERRAL_002.evaluate(ctx).passed).toBe(true);
  });
});

// ─── EVAL_INIT_001 — Consent granted ────────────────────────────────────────

describe('IDEA_EVAL_INIT_001 — Consent GRANTED required', () => {
  it('passes when consent is GRANTED', () => {
    const ctx = ctxWithState('CONSENT_REQUESTED', {
      consents: [{
        id: 'cr-1', tenantId: 'tenant-1', caseId: 'case-1',
        consentType: 'INITIAL_EVALUATION', decision: 'GRANTED',
        respondentId: 'parent-1', respondentName: 'Jane Doe',
        consentDate: '2025-09-15', documentHash: 'h1', artifactRef: 'a1',
        notes: null, createdAt: '2025-09-15',
      }],
    });
    expect(EVAL_INIT_001.evaluate(ctx).passed).toBe(true);
  });

  it('fails when consent is REFUSED', () => {
    const ctx = ctxWithState('CONSENT_REQUESTED', {
      consents: [{
        id: 'cr-1', tenantId: 'tenant-1', caseId: 'case-1',
        consentType: 'INITIAL_EVALUATION', decision: 'REFUSED',
        respondentId: 'parent-1', respondentName: 'Jane Doe',
        consentDate: '2025-09-15', documentHash: 'h1', artifactRef: 'a1',
        notes: null, createdAt: '2025-09-15',
      }],
    });
    expect(EVAL_INIT_001.evaluate(ctx).passed).toBe(false);
  });

  it('fails when no consents exist', () => {
    const ctx = ctxWithState('CONSENT_REQUESTED');
    expect(EVAL_INIT_001.evaluate(ctx).passed).toBe(false);
  });

  it('auto-passes when not in CONSENT_REQUESTED state', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED');
    expect(EVAL_INIT_001.evaluate(ctx).passed).toBe(true);
  });
});

// ─── EVAL_INIT_002 — Evaluation plan ────────────────────────────────────────

describe('IDEA_EVAL_INIT_002 — Evaluation plan must exist', () => {
  it('passes when plan exists', () => {
    const ctx = ctxWithState('CONSENT_RECEIVED', {
      plan: {
        id: 'plan-1', tenantId: 'tenant-1', caseId: 'case-1',
        assessmentDomains: ['ACADEMIC_ACHIEVEMENT', 'COGNITIVE'],
        planContent: '<html>plan</html>', planHash: 'h1', artifactRef: 'a1',
        createdBy: 'user-1', createdAt: '2025-09-20',
      },
    });
    expect(EVAL_INIT_002.evaluate(ctx).passed).toBe(true);
  });

  it('fails when plan is null', () => {
    const ctx = ctxWithState('CONSENT_RECEIVED', { plan: null });
    const result = EVAL_INIT_002.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('auto-passes when not in CONSENT_RECEIVED state', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED');
    expect(EVAL_INIT_002.evaluate(ctx).passed).toBe(true);
  });
});

// ─── EVAL_INIT_003 — 60-day timeline ────────────────────────────────────────

describe('IDEA_EVAL_INIT_003 — 60-day evaluation timeline', () => {
  it('passes when within 60 days of consent', () => {
    const ctx = ctxWithState('CONSENT_RECEIVED', {
      evaluationCase: {
        ...makeCtx().evaluationCase,
        currentState: 'CONSENT_RECEIVED',
        consentReceivedDate: '2025-09-15',
      },
      nowDate: '2025-10-01',
    });
    const result = EVAL_INIT_003.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('ERROR');
  });

  it('fails when past 60 days from consent', () => {
    const ctx = ctxWithState('ASSESSMENTS_IN_PROGRESS', {
      evaluationCase: {
        ...makeCtx().evaluationCase,
        currentState: 'ASSESSMENTS_IN_PROGRESS',
        consentReceivedDate: '2025-06-01',
      },
      nowDate: '2025-10-01',
    });
    const result = EVAL_INIT_003.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('OVERDUE');
  });

  it('passes when exactly at day 60', () => {
    const ctx = ctxWithState('CONSENT_RECEIVED', {
      evaluationCase: {
        ...makeCtx().evaluationCase,
        currentState: 'CONSENT_RECEIVED',
        consentReceivedDate: '2025-08-01',
      },
      nowDate: '2025-09-30',
    });
    const result = EVAL_INIT_003.evaluate(ctx);
    expect(result.passed).toBe(true);
  });

  it('auto-passes when no consent date', () => {
    const ctx = ctxWithState('CONSENT_RECEIVED', {
      evaluationCase: {
        ...makeCtx().evaluationCase,
        currentState: 'CONSENT_RECEIVED',
        consentReceivedDate: null,
      },
    });
    expect(EVAL_INIT_003.evaluate(ctx).passed).toBe(true);
  });

  it('respects state overlay timeline days', () => {
    const ctx = ctxWithState('CONSENT_RECEIVED', {
      evaluationCase: {
        ...makeCtx().evaluationCase,
        currentState: 'CONSENT_RECEIVED',
        consentReceivedDate: '2025-08-01',
      },
      stateOverlay: {
        ...BASE_OVERLAY,
        evaluationTimelineDays: 45,
        stateCode: 'CUSTOM',
      },
      nowDate: '2025-09-20',
    });
    const result = EVAL_INIT_003.evaluate(ctx);
    // 50 days elapsed, 45-day limit → should fail
    expect(result.passed).toBe(false);
  });

  it('applies to ASSESSMENTS_IN_PROGRESS state', () => {
    expect(EVAL_INIT_003.appliesTo).toContain('ASSESSMENTS_IN_PROGRESS');
  });

  it('applies to ELIGIBILITY_MEETING state', () => {
    expect(EVAL_INIT_003.appliesTo).toContain('ELIGIBILITY_MEETING');
  });
});

// ─── EVAL_INIT_004 — All assessments complete ──────────────────────────────

describe('IDEA_EVAL_INIT_004 — All assessments complete', () => {
  it('passes when all assignments completed', () => {
    const ctx = ctxWithState('ASSESSMENTS_IN_PROGRESS', {
      assignments: [
        { id: 'a1', tenantId: 't', caseId: 'case-1', assessorId: 'u1', domain: 'COGNITIVE', dueDate: null, completedAt: '2025-10-01', createdAt: '2025-09-20', updatedAt: '2025-10-01' },
        { id: 'a2', tenantId: 't', caseId: 'case-1', assessorId: 'u2', domain: 'ACADEMIC_ACHIEVEMENT', dueDate: null, completedAt: '2025-10-05', createdAt: '2025-09-20', updatedAt: '2025-10-05' },
      ],
    });
    expect(EVAL_INIT_004.evaluate(ctx).passed).toBe(true);
  });

  it('fails when some assignments incomplete', () => {
    const ctx = ctxWithState('ASSESSMENTS_IN_PROGRESS', {
      assignments: [
        { id: 'a1', tenantId: 't', caseId: 'case-1', assessorId: 'u1', domain: 'COGNITIVE', dueDate: null, completedAt: '2025-10-01', createdAt: '2025-09-20', updatedAt: '2025-10-01' },
        { id: 'a2', tenantId: 't', caseId: 'case-1', assessorId: 'u2', domain: 'ACADEMIC_ACHIEVEMENT', dueDate: null, completedAt: null, createdAt: '2025-09-20', updatedAt: '2025-09-20' },
      ],
    });
    const result = EVAL_INIT_004.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('1 of 2');
  });

  it('fails when no assignments exist', () => {
    const ctx = ctxWithState('ASSESSMENTS_IN_PROGRESS', { assignments: [] });
    expect(EVAL_INIT_004.evaluate(ctx).passed).toBe(false);
  });

  it('auto-passes when not in ASSESSMENTS_IN_PROGRESS state', () => {
    const ctx = ctxWithState('EVAL_TRIGGERED');
    expect(EVAL_INIT_004.evaluate(ctx).passed).toBe(true);
  });
});

// ─── EVAL_INIT_005 — Required meeting roles ────────────────────────────────

describe('IDEA_EVAL_INIT_005 — Required meeting roles', () => {
  const allRoles = [
    { name: 'Parent A', role: 'PARENT' },
    { name: 'Teacher B', role: 'GENERAL_EDUCATION_TEACHER' },
    { name: 'SPED C', role: 'SPECIAL_EDUCATION_TEACHER' },
    { name: 'Admin D', role: 'LEA_REPRESENTATIVE' },
  ];

  it('passes when all required roles present', () => {
    const ctx = ctxWithState('ELIGIBILITY_MEETING', {
      eligibilityMeeting: {
        id: 'em-1', tenantId: 't', caseId: 'case-1',
        scheduledDate: '2025-11-01', actualDate: '2025-11-01',
        attendees: allRoles, requiredRoles: [],
        meetingNotes: null, meetingHash: null,
        createdAt: '2025-10-15', updatedAt: '2025-11-01',
      },
    });
    expect(EVAL_INIT_005.evaluate(ctx).passed).toBe(true);
  });

  it('fails when PARENT role missing', () => {
    const ctx = ctxWithState('ELIGIBILITY_MEETING', {
      eligibilityMeeting: {
        id: 'em-1', tenantId: 't', caseId: 'case-1',
        scheduledDate: '2025-11-01', actualDate: '2025-11-01',
        attendees: allRoles.filter((a) => a.role !== 'PARENT'),
        requiredRoles: [], meetingNotes: null, meetingHash: null,
        createdAt: '2025-10-15', updatedAt: '2025-11-01',
      },
    });
    const result = EVAL_INIT_005.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('PARENT');
  });

  it('fails when meeting not scheduled', () => {
    const ctx = ctxWithState('ELIGIBILITY_MEETING', { eligibilityMeeting: null });
    const result = EVAL_INIT_005.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not been scheduled');
  });

  it('includes state overlay additional roles', () => {
    const ctx = ctxWithState('ELIGIBILITY_MEETING', {
      stateOverlay: {
        ...BASE_OVERLAY,
        stateCode: 'LA',
        additionalRequiredMeetingRoles: ['SCHOOL_PSYCHOLOGIST'],
      },
      eligibilityMeeting: {
        id: 'em-1', tenantId: 't', caseId: 'case-1',
        scheduledDate: '2025-11-01', actualDate: '2025-11-01',
        attendees: allRoles,
        requiredRoles: [], meetingNotes: null, meetingHash: null,
        createdAt: '2025-10-15', updatedAt: '2025-11-01',
      },
    });
    const result = EVAL_INIT_005.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('SCHOOL_PSYCHOLOGIST');
  });

  it('passes with overlay roles when all present', () => {
    const ctx = ctxWithState('ELIGIBILITY_MEETING', {
      stateOverlay: {
        ...BASE_OVERLAY,
        stateCode: 'LA',
        additionalRequiredMeetingRoles: ['SCHOOL_PSYCHOLOGIST'],
      },
      eligibilityMeeting: {
        id: 'em-1', tenantId: 't', caseId: 'case-1',
        scheduledDate: '2025-11-01', actualDate: '2025-11-01',
        attendees: [...allRoles, { name: 'Psych E', role: 'SCHOOL_PSYCHOLOGIST' }],
        requiredRoles: [], meetingNotes: null, meetingHash: null,
        createdAt: '2025-10-15', updatedAt: '2025-11-01',
      },
    });
    expect(EVAL_INIT_005.evaluate(ctx).passed).toBe(true);
  });
});

// ─── EVAL_INIT_006 — PWN for decision ──────────────────────────────────────

describe('IDEA_EVAL_INIT_006 — PWN for eligibility decision', () => {
  it('passes when PWN exists for the case', () => {
    const ctx = ctxWithState('ELIGIBILITY_DECISION', {
      priorWrittenNotices: [{ id: 'pwn-1', caseId: 'case-1' }],
    });
    expect(EVAL_INIT_006.evaluate(ctx).passed).toBe(true);
  });

  it('fails when no PWN', () => {
    const ctx = ctxWithState('ELIGIBILITY_DECISION', { priorWrittenNotices: [] });
    const result = EVAL_INIT_006.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });
});

// ─── REEVAL_001 — Reevaluation frequency ───────────────────────────────────

describe('IDEA_REEVAL_001 — Reevaluation frequency constraints', () => {
  function reevalCtx(daysSinceLast: number) {
    const lastClosed = new Date('2025-01-01');
    const now = new Date(lastClosed.getTime() + daysSinceLast * 86_400_000);
    return makeCtx({
      evaluationCase: {
        ...makeCtx().evaluationCase,
        caseType: 'REEVALUATION',
        currentState: 'EVAL_TRIGGERED',
      },
      previousEvaluations: [
        { id: 'prev-1', closedDate: lastClosed.toISOString(), createdAt: '2024-01-01' },
      ],
      nowDate: now.toISOString(),
    });
  }

  it('passes when 500 days since last eval (within 1-3 year window)', () => {
    expect(REEVAL_001.evaluate(reevalCtx(500)).passed).toBe(true);
  });

  it('fails when less than 365 days since last eval', () => {
    const result = REEVAL_001.evaluate(reevalCtx(200));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('once per year');
  });

  it('fails when more than 1095 days (3 years overdue)', () => {
    const result = REEVAL_001.evaluate(reevalCtx(1200));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('OVERDUE');
  });

  it('passes at exactly 365 days', () => {
    expect(REEVAL_001.evaluate(reevalCtx(365)).passed).toBe(true);
  });

  it('passes at exactly 1095 days', () => {
    expect(REEVAL_001.evaluate(reevalCtx(1095)).passed).toBe(true);
  });

  it('auto-passes for non-reevaluation case', () => {
    const ctx = makeCtx(); // default INITIAL case
    expect(REEVAL_001.evaluate(ctx).passed).toBe(true);
  });

  it('auto-passes when no previous evaluations', () => {
    const ctx = makeCtx({
      evaluationCase: {
        ...makeCtx().evaluationCase,
        caseType: 'REEVALUATION',
      },
      previousEvaluations: [],
    });
    expect(REEVAL_001.evaluate(ctx).passed).toBe(true);
  });
});

// ─── DISMISS_001 — PWN before dismissal ────────────────────────────────────

describe('IDEA_DISMISS_001 — PWN before dismissal', () => {
  it('passes when PWN exists for the case', () => {
    const ctx = makeCtx({
      evaluationCase: {
        ...makeCtx().evaluationCase,
        caseType: 'DISMISSAL',
        currentState: 'EVAL_TRIGGERED',
      },
      priorWrittenNotices: [{ id: 'pwn-1', caseId: 'case-1' }],
    });
    expect(DISMISS_001.evaluate(ctx).passed).toBe(true);
  });

  it('fails when no PWN for dismissal case', () => {
    const ctx = makeCtx({
      evaluationCase: {
        ...makeCtx().evaluationCase,
        caseType: 'DISMISSAL',
        currentState: 'EVAL_TRIGGERED',
      },
      priorWrittenNotices: [],
    });
    const result = DISMISS_001.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('CRITICAL');
  });

  it('auto-passes for non-dismissal case', () => {
    expect(DISMISS_001.evaluate(makeCtx()).passed).toBe(true);
  });
});

// ─── ALL_EVAL_RULES ────────────────────────────────────────────────────────

describe('ALL_EVAL_RULES registry', () => {
  it('contains exactly 10 rules', () => {
    expect(ALL_EVAL_RULES).toHaveLength(10);
  });

  it('has unique rule codes', () => {
    const codes = ALL_EVAL_RULES.map((r) => r.ruleCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('all rules have appliesTo arrays', () => {
    for (const rule of ALL_EVAL_RULES) {
      expect(Array.isArray(rule.appliesTo)).toBe(true);
      expect(rule.appliesTo.length).toBeGreaterThan(0);
    }
  });
});
