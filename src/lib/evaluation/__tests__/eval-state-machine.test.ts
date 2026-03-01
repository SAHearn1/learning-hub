import { describe, it, expect } from 'vitest';
import {
  TRANSITIONS,
  getValidTransitions,
  isValidTransition,
  findTransition,
  evaluateTransition,
} from '../eval-state-machine';
import type { EvalCaseContext, EvalCaseState, StateOverlay } from '@/types/evaluation';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE_OVERLAY: StateOverlay = {
  stateCode: 'US',
  stateName: 'Federal Baseline',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'CALENDAR_DAYS',
  additionalRequiredMeetingRoles: [],
};

function makeCtx(state: EvalCaseState, extras: Partial<EvalCaseContext> = {}): EvalCaseContext {
  return {
    evaluationCase: {
      id: 'case-1', tenantId: 'tenant-1', studentId: 'student-1',
      caseType: 'INITIAL', currentState: state, stateCode: 'US',
      referralSource: 'PARENT', referralReason: 'Concern',
      referralDate: '2025-09-01', consentRequestedDate: null,
      consentReceivedDate: null, evaluationDueDate: null,
      eligibilityDate: null, closedDate: null, closedReason: null,
      correlationId: 'corr-1', metadata: null, createdBy: 'user-1',
      createdAt: '2025-09-01', updatedAt: '2025-09-01',
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
    ...extras,
  };
}

// ─── TRANSITIONS graph ──────────────────────────────────────────────────────

describe('TRANSITIONS graph', () => {
  it('defines 12 transitions', () => {
    expect(TRANSITIONS).toHaveLength(12);
  });

  it('includes CONSENT_REFUSED → CLOSED path', () => {
    const found = TRANSITIONS.find(
      (t) => t.from === 'CONSENT_REFUSED' && t.to === 'CLOSED',
    );
    expect(found).toBeDefined();
    expect(found!.guardRules).toHaveLength(0);
  });

  it('all transitions have valid from/to states', () => {
    const validStates: EvalCaseState[] = [
      'EVAL_TRIGGERED', 'SAFEGUARDS_ISSUED', 'SAFEGUARDS_REQUIRED',
      'CONSENT_REQUESTED', 'CONSENT_RECEIVED', 'CONSENT_REFUSED',
      'EVALUATION_PLANNED', 'ASSESSMENTS_IN_PROGRESS', 'ASSESSMENTS_COMPLETE',
      'ELIGIBILITY_MEETING', 'ELIGIBILITY_DECISION', 'CLOSED',
    ];
    for (const t of TRANSITIONS) {
      expect(validStates).toContain(t.from);
      expect(validStates).toContain(t.to);
    }
  });
});

// ─── getValidTransitions ────────────────────────────────────────────────────

describe('getValidTransitions', () => {
  it('returns SAFEGUARDS_ISSUED from EVAL_TRIGGERED', () => {
    expect(getValidTransitions('EVAL_TRIGGERED')).toEqual(['SAFEGUARDS_ISSUED']);
  });

  it('returns both CONSENT_RECEIVED and CONSENT_REFUSED from CONSENT_REQUESTED', () => {
    const next = getValidTransitions('CONSENT_REQUESTED');
    expect(next).toContain('CONSENT_RECEIVED');
    expect(next).toContain('CONSENT_REFUSED');
  });

  it('returns empty array from CLOSED', () => {
    expect(getValidTransitions('CLOSED')).toEqual([]);
  });
});

// ─── isValidTransition ──────────────────────────────────────────────────────

describe('isValidTransition', () => {
  it('returns true for valid transition', () => {
    expect(isValidTransition('EVAL_TRIGGERED', 'SAFEGUARDS_ISSUED')).toBe(true);
  });

  it('returns false for invalid transition', () => {
    expect(isValidTransition('EVAL_TRIGGERED', 'CLOSED')).toBe(false);
  });

  it('returns false for backwards transition', () => {
    expect(isValidTransition('SAFEGUARDS_ISSUED', 'EVAL_TRIGGERED')).toBe(false);
  });
});

// ─── findTransition ─────────────────────────────────────────────────────────

describe('findTransition', () => {
  it('returns transition object for valid pair', () => {
    const t = findTransition('CONSENT_RECEIVED', 'EVALUATION_PLANNED');
    expect(t).not.toBeNull();
    expect(t!.guardRules).toContain('IDEA_EVAL_INIT_002');
  });

  it('returns null for invalid pair', () => {
    expect(findTransition('CLOSED', 'EVAL_TRIGGERED')).toBeNull();
  });
});

// ─── evaluateTransition ─────────────────────────────────────────────────────

describe('evaluateTransition', () => {
  it('allows transition with no guard rules', () => {
    const ctx = makeCtx('SAFEGUARDS_ISSUED');
    const result = evaluateTransition('SAFEGUARDS_ISSUED', 'SAFEGUARDS_REQUIRED', ctx);
    expect(result.allowed).toBe(true);
    expect(result.ruleResults).toHaveLength(0);
    expect(result.transitionHash).toBeTruthy();
  });

  it('rejects invalid transition path', () => {
    const ctx = makeCtx('EVAL_TRIGGERED');
    const result = evaluateTransition('EVAL_TRIGGERED', 'CLOSED', ctx);
    expect(result.allowed).toBe(false);
    expect(result.transitionHash).toBeNull();
    expect(result.ruleResults[0].ruleCode).toBe('STATE_MACHINE');
  });

  it('allows EVAL_TRIGGERED → SAFEGUARDS_ISSUED when safeguards delivered', () => {
    const ctx = makeCtx('EVAL_TRIGGERED', {
      safeguardsNotices: [{ id: 'sn-1', deliveryStatus: 'DELIVERED', trigger: 'INITIAL_REFERRAL' }],
    });
    const result = evaluateTransition('EVAL_TRIGGERED', 'SAFEGUARDS_ISSUED', ctx);
    expect(result.allowed).toBe(true);
    expect(result.transitionHash).toBeTruthy();
  });

  it('rejects EVAL_TRIGGERED → SAFEGUARDS_ISSUED when safeguards not delivered', () => {
    const ctx = makeCtx('EVAL_TRIGGERED', { safeguardsNotices: [] });
    const result = evaluateTransition('EVAL_TRIGGERED', 'SAFEGUARDS_ISSUED', ctx);
    expect(result.allowed).toBe(false);
    expect(result.transitionHash).toBeNull();
  });

  it('allows CONSENT_REQUESTED → CONSENT_RECEIVED with granted consent', () => {
    const ctx = makeCtx('CONSENT_REQUESTED', {
      consents: [{
        id: 'cr-1', tenantId: 'tenant-1', caseId: 'case-1',
        consentType: 'INITIAL_EVALUATION', decision: 'GRANTED',
        respondentId: 'p-1', respondentName: 'Jane',
        consentDate: '2025-09-15', documentHash: 'h1', artifactRef: 'a1',
        notes: null, createdAt: '2025-09-15',
      }],
    });
    const result = evaluateTransition('CONSENT_REQUESTED', 'CONSENT_RECEIVED', ctx);
    expect(result.allowed).toBe(true);
  });

  it('rejects CONSENT_RECEIVED → EVALUATION_PLANNED without plan', () => {
    const ctx = makeCtx('CONSENT_RECEIVED', { plan: null });
    const result = evaluateTransition('CONSENT_RECEIVED', 'EVALUATION_PLANNED', ctx);
    expect(result.allowed).toBe(false);
  });

  it('generates a unique hash per transition', () => {
    const ctx1 = makeCtx('SAFEGUARDS_ISSUED', { nowDate: '2025-10-01T10:00:00Z' });
    const ctx2 = makeCtx('SAFEGUARDS_ISSUED', { nowDate: '2025-10-01T11:00:00Z' });
    const r1 = evaluateTransition('SAFEGUARDS_ISSUED', 'SAFEGUARDS_REQUIRED', ctx1);
    const r2 = evaluateTransition('SAFEGUARDS_ISSUED', 'SAFEGUARDS_REQUIRED', ctx2);
    expect(r1.transitionHash).not.toBe(r2.transitionHash);
  });
});
