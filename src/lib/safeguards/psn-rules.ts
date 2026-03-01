/**
 * IDEA Procedural Safeguards Notice — Deterministic Validation Rules
 *
 * Six rules covering every trigger point in 34 CFR §300.504(a).
 * Each rule accepts a ProceduralSafeguardsContext and returns a
 * ProceduralSafeguardsRuleResult with pass/fail, severity, and legal citation.
 */

import type {
  ProceduralSafeguardsContext,
  ProceduralSafeguardsRuleResult,
  SafeguardsTrigger,
} from '@/types/safeguards';

export type PsnRule = {
  ruleCode: string;
  trigger: SafeguardsTrigger;
  evaluate: (ctx: ProceduralSafeguardsContext) => ProceduralSafeguardsRuleResult;
};

function hasDeliveredNotice(ctx: ProceduralSafeguardsContext): boolean {
  return ctx.existingNotices.some(
    (n) =>
      n.studentId === ctx.studentId &&
      n.schoolYear === ctx.schoolYear &&
      (n.deliveryStatus === 'DELIVERED' || n.deliveryStatus === 'ACKNOWLEDGED'),
  );
}

function hasNoticeForEvent(ctx: ProceduralSafeguardsContext, eventId?: string): boolean {
  const targetId = eventId ?? ctx.proceduralEventId;
  if (!targetId) return false;
  return ctx.existingNotices.some(
    (n) =>
      n.proceduralEventId === targetId &&
      (n.deliveryStatus === 'DELIVERED' || n.deliveryStatus === 'ACKNOWLEDGED'),
  );
}

// ---------------------------------------------------------------------------
// IDEA_PSN_001 — Annual Notice Obligation
// ---------------------------------------------------------------------------
export const PSN_001: PsnRule = {
  ruleCode: 'IDEA_PSN_001',
  trigger: 'ANNUAL_NOTICE',
  evaluate(ctx) {
    const passed = hasDeliveredNotice(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.504(a)',
      message: passed
        ? 'Annual safeguards notice has been delivered for this school year.'
        : 'No delivered safeguards notice found for this student in the current school year.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PSN_002 — Initial Referral / Parent Evaluation Request
// ---------------------------------------------------------------------------
export const PSN_002: PsnRule = {
  ruleCode: 'IDEA_PSN_002',
  trigger: 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
  evaluate(ctx) {
    const passed = hasNoticeForEvent(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.504(a)(1)',
      message: passed
        ? 'Safeguards notice delivered for initial referral or parent evaluation request.'
        : 'Safeguards notice has NOT been delivered for this referral/evaluation request event.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PSN_003 — First State Complaint in School Year
// ---------------------------------------------------------------------------
export const PSN_003: PsnRule = {
  ruleCode: 'IDEA_PSN_003',
  trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
  evaluate(ctx) {
    const firstEvent = ctx.existingEvents.find(
      (e) =>
        e.eventType === 'STATE_COMPLAINT_FILED' &&
        e.schoolYear === ctx.schoolYear &&
        e.isFirstOfType,
    );
    const passed = firstEvent
      ? ctx.existingNotices.some(
          (n) =>
            n.proceduralEventId === firstEvent.id &&
            (n.deliveryStatus === 'DELIVERED' || n.deliveryStatus === 'ACKNOWLEDGED'),
        )
      : false;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.504(a)(2)',
      message: passed
        ? 'Safeguards notice delivered for first state complaint this school year.'
        : 'Safeguards notice NOT delivered for the first state complaint this school year.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PSN_004 — First Due Process Complaint in School Year
// ---------------------------------------------------------------------------
export const PSN_004: PsnRule = {
  ruleCode: 'IDEA_PSN_004',
  trigger: 'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR',
  evaluate(ctx) {
    const firstEvent = ctx.existingEvents.find(
      (e) =>
        e.eventType === 'DUE_PROCESS_COMPLAINT_FILED' &&
        e.schoolYear === ctx.schoolYear &&
        e.isFirstOfType,
    );
    const passed = firstEvent
      ? ctx.existingNotices.some(
          (n) =>
            n.proceduralEventId === firstEvent.id &&
            (n.deliveryStatus === 'DELIVERED' || n.deliveryStatus === 'ACKNOWLEDGED'),
        )
      : false;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.504(a)(3)',
      message: passed
        ? 'Safeguards notice delivered for first due process complaint this school year.'
        : 'Safeguards notice NOT delivered for the first due process complaint this school year.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PSN_005 — Disciplinary Change of Placement
// ---------------------------------------------------------------------------
export const PSN_005: PsnRule = {
  ruleCode: 'IDEA_PSN_005',
  trigger: 'DISCIPLINARY_CHANGE_OF_PLACEMENT',
  evaluate(ctx) {
    const passed = hasNoticeForEvent(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.504(a)(4), §300.530',
      message: passed
        ? 'Safeguards notice delivered for disciplinary change of placement.'
        : 'Safeguards notice has NOT been delivered for this disciplinary change of placement.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_PSN_006 — Parent Request
// ---------------------------------------------------------------------------
export const PSN_006: PsnRule = {
  ruleCode: 'IDEA_PSN_006',
  trigger: 'PARENT_REQUEST',
  evaluate(ctx) {
    // Parent request requires DELIVERED (not just GENERATED)
    const passed = hasNoticeForEvent(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.504(a)',
      message: passed
        ? 'Safeguards notice delivered in response to parent request.'
        : 'Safeguards notice has NOT been delivered for this parent request (PENDING/GENERATED is insufficient).',
    };
  },
};

export const ALL_PSN_RULES: PsnRule[] = [PSN_001, PSN_002, PSN_003, PSN_004, PSN_005, PSN_006];
