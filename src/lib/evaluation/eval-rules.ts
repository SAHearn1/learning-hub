/**
 * IDEA Evaluation Governance — Federal Baseline Rules
 *
 * Ten rules covering 34 CFR §300.300–§300.311.
 * Each rule specifies the state it applies to and evaluates against an EvalCaseContext.
 */

import type {
  EvalCaseContext,
  EvalCaseState,
  EvalRuleResult,
} from '@/types/evaluation';

export type EvalRule = {
  ruleCode: string;
  appliesTo: EvalCaseState[];
  evaluate: (ctx: EvalCaseContext) => EvalRuleResult;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasSafeguardsNotice(ctx: EvalCaseContext): boolean {
  return ctx.safeguardsNotices.some(
    (n) => n.deliveryStatus === 'DELIVERED' || n.deliveryStatus === 'ACKNOWLEDGED',
  );
}

function hasPwnForCase(ctx: EvalCaseContext): boolean {
  return ctx.priorWrittenNotices.some(
    (p) => p.caseId === ctx.evaluationCase.id,
  );
}

function hasGrantedConsent(ctx: EvalCaseContext): boolean {
  return ctx.consents.some((c) => c.decision === 'GRANTED');
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay,
  );
}

// ---------------------------------------------------------------------------
// IDEA_REFERRAL_001 — Safeguards notice must be issued on referral
// ---------------------------------------------------------------------------
export const REFERRAL_001: EvalRule = {
  ruleCode: 'IDEA_REFERRAL_001',
  appliesTo: ['EVAL_TRIGGERED'],
  evaluate(ctx) {
    const state: EvalCaseState = 'EVAL_TRIGGERED';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.504(a)(1)', 'Not in applicable state.');
    }
    const passed = hasSafeguardsNotice(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.504(a)(1)',
      appliesTo: state,
      message: passed
        ? 'Procedural safeguards notice has been delivered for this referral.'
        : 'Procedural safeguards notice has NOT been delivered. Required upon initial referral.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_REFERRAL_002 — PWN must exist before consent request
// ---------------------------------------------------------------------------
export const REFERRAL_002: EvalRule = {
  ruleCode: 'IDEA_REFERRAL_002',
  appliesTo: ['SAFEGUARDS_REQUIRED'],
  evaluate(ctx) {
    const state: EvalCaseState = 'SAFEGUARDS_REQUIRED';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.503(a)', 'Not in applicable state.');
    }
    const passed = hasPwnForCase(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.503(a)',
      appliesTo: state,
      message: passed
        ? 'Prior Written Notice exists for this case.'
        : 'Prior Written Notice (PWN) is REQUIRED before requesting consent for evaluation.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_EVAL_INIT_001 — Consent GRANTED required
// ---------------------------------------------------------------------------
export const EVAL_INIT_001: EvalRule = {
  ruleCode: 'IDEA_EVAL_INIT_001',
  appliesTo: ['CONSENT_REQUESTED'],
  evaluate(ctx) {
    const state: EvalCaseState = 'CONSENT_REQUESTED';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.300(a)(1)(i)', 'Not in applicable state.');
    }
    const passed = hasGrantedConsent(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.300(a)(1)(i)',
      appliesTo: state,
      message: passed
        ? 'Parent consent GRANTED for evaluation.'
        : 'Parent consent has NOT been received. Evaluation cannot proceed without informed consent.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_EVAL_INIT_002 — Evaluation plan must exist
// ---------------------------------------------------------------------------
export const EVAL_INIT_002: EvalRule = {
  ruleCode: 'IDEA_EVAL_INIT_002',
  appliesTo: ['CONSENT_RECEIVED'],
  evaluate(ctx) {
    const state: EvalCaseState = 'CONSENT_RECEIVED';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.304(b)', 'Not in applicable state.');
    }
    const passed = ctx.plan !== null;
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.304(b)',
      appliesTo: state,
      message: passed
        ? 'Evaluation plan exists for this case.'
        : 'Evaluation plan is REQUIRED before proceeding with assessments.',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_EVAL_INIT_003 — 60 calendar days from consent (federal baseline)
// ---------------------------------------------------------------------------
export const EVAL_INIT_003: EvalRule = {
  ruleCode: 'IDEA_EVAL_INIT_003',
  appliesTo: [
    'CONSENT_RECEIVED',
    'EVALUATION_PLANNED',
    'ASSESSMENTS_IN_PROGRESS',
    'ASSESSMENTS_COMPLETE',
    'ELIGIBILITY_MEETING',
  ],
  evaluate(ctx) {
    const state = ctx.evaluationCase.currentState as EvalCaseState;
    const consentDate = ctx.evaluationCase.consentReceivedDate;
    if (!consentDate) {
      return pass(this.ruleCode, state, '34 CFR §300.301(c)(1)', 'No consent date recorded.');
    }

    const timelineDays = ctx.stateOverlay.evaluationTimelineDays;
    const elapsed = daysBetween(consentDate, ctx.nowDate);
    const passed = elapsed <= timelineDays;

    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.301(c)(1)',
      appliesTo: state,
      message: passed
        ? `${elapsed} days elapsed of ${timelineDays}-day timeline (${ctx.stateOverlay.stateCode}).`
        : `OVERDUE: ${elapsed} days elapsed, exceeding the ${timelineDays}-day evaluation timeline (${ctx.stateOverlay.stateCode}).`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_EVAL_INIT_004 — All assessments complete
// ---------------------------------------------------------------------------
export const EVAL_INIT_004: EvalRule = {
  ruleCode: 'IDEA_EVAL_INIT_004',
  appliesTo: ['ASSESSMENTS_IN_PROGRESS'],
  evaluate(ctx) {
    const state: EvalCaseState = 'ASSESSMENTS_IN_PROGRESS';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.304(b)(1)', 'Not in applicable state.');
    }

    const totalAssignments = ctx.assignments.length;
    const completedAssignments = ctx.assignments.filter((a) => a.completedAt !== null).length;
    const passed = totalAssignments > 0 && completedAssignments === totalAssignments;

    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'ERROR',
      legalReference: '34 CFR §300.304(b)(1)',
      appliesTo: state,
      message: passed
        ? `All ${totalAssignments} assessments completed.`
        : `${completedAssignments} of ${totalAssignments} assessments completed. All must be complete before eligibility.`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_EVAL_INIT_005 — Required meeting roles present
// ---------------------------------------------------------------------------
export const EVAL_INIT_005: EvalRule = {
  ruleCode: 'IDEA_EVAL_INIT_005',
  appliesTo: ['ELIGIBILITY_MEETING'],
  evaluate(ctx) {
    const state: EvalCaseState = 'ELIGIBILITY_MEETING';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.306(a)(1)', 'Not in applicable state.');
    }

    if (!ctx.eligibilityMeeting) {
      return {
        ruleCode: this.ruleCode,
        passed: false,
        severity: 'CRITICAL',
        legalReference: '34 CFR §300.306(a)(1)',
        appliesTo: state,
        message: 'Eligibility meeting has not been scheduled.',
      };
    }

    // Federal baseline required roles + state overlay additions
    const baseRequired = ['PARENT', 'GENERAL_EDUCATION_TEACHER', 'SPECIAL_EDUCATION_TEACHER', 'LEA_REPRESENTATIVE'];
    const stateRequired = ctx.stateOverlay.additionalRequiredMeetingRoles;
    const allRequired = [...new Set([...baseRequired, ...stateRequired])];

    const attendeeRoles = ctx.eligibilityMeeting.attendees.map((a) => a.role);
    const missingRoles = allRequired.filter((r) => !attendeeRoles.includes(r));
    const passed = missingRoles.length === 0;

    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.306(a)(1)',
      appliesTo: state,
      message: passed
        ? 'All required meeting roles are present.'
        : `Missing required roles: ${missingRoles.join(', ')}.`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_EVAL_INIT_006 — PWN required for eligibility decision
// ---------------------------------------------------------------------------
export const EVAL_INIT_006: EvalRule = {
  ruleCode: 'IDEA_EVAL_INIT_006',
  appliesTo: ['ELIGIBILITY_DECISION'],
  evaluate(ctx) {
    const state: EvalCaseState = 'ELIGIBILITY_DECISION';
    if (ctx.evaluationCase.currentState !== state) {
      return pass(this.ruleCode, state, '34 CFR §300.503(a)', 'Not in applicable state.');
    }
    const passed = hasPwnForCase(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.503(a)',
      appliesTo: state,
      message: passed
        ? 'Prior Written Notice exists for the eligibility decision.'
        : 'PWN is REQUIRED for the eligibility decision per 34 CFR §300.503(a).',
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_REEVAL_001 — Reevaluation frequency constraints
// ---------------------------------------------------------------------------
export const REEVAL_001: EvalRule = {
  ruleCode: 'IDEA_REEVAL_001',
  appliesTo: ['EVAL_TRIGGERED'],
  evaluate(ctx) {
    const state: EvalCaseState = 'EVAL_TRIGGERED';
    if (ctx.evaluationCase.caseType !== 'REEVALUATION') {
      return pass(this.ruleCode, state, '34 CFR §300.303(b)', 'Not a reevaluation case.');
    }

    const prev = ctx.previousEvaluations;
    if (prev.length === 0) {
      return pass(this.ruleCode, state, '34 CFR §300.303(b)', 'No previous evaluations found.');
    }

    // Sort by closedDate descending
    const sorted = [...prev]
      .filter((e) => e.closedDate)
      .sort((a, b) => new Date(b.closedDate!).getTime() - new Date(a.closedDate!).getTime());

    if (sorted.length === 0) {
      return pass(this.ruleCode, state, '34 CFR §300.303(b)', 'No completed previous evaluations.');
    }

    const lastClosedDate = sorted[0].closedDate!;
    const daysSinceLast = daysBetween(lastClosedDate, ctx.nowDate);

    // Not more than once per year (365 days) unless parent and district agree
    if (daysSinceLast < 365) {
      return {
        ruleCode: this.ruleCode,
        passed: false,
        severity: 'ERROR',
        legalReference: '34 CFR §300.303(b)',
        appliesTo: state,
        message: `Only ${daysSinceLast} days since last evaluation. Reevaluation cannot occur more than once per year without agreement.`,
      };
    }

    // Must occur at least every 3 years (1095 days)
    if (daysSinceLast > 1095) {
      return {
        ruleCode: this.ruleCode,
        passed: false,
        severity: 'ERROR',
        legalReference: '34 CFR §300.303(b)',
        appliesTo: state,
        message: `${daysSinceLast} days since last evaluation. Reevaluation is OVERDUE (must occur at least every 3 years).`,
      };
    }

    return {
      ruleCode: this.ruleCode,
      passed: true,
      severity: 'ERROR',
      legalReference: '34 CFR §300.303(b)',
      appliesTo: state,
      message: `${daysSinceLast} days since last evaluation. Within permissible reevaluation window.`,
    };
  },
};

// ---------------------------------------------------------------------------
// IDEA_DISMISS_001 — PWN required before dismissal
// ---------------------------------------------------------------------------
export const DISMISS_001: EvalRule = {
  ruleCode: 'IDEA_DISMISS_001',
  appliesTo: ['EVAL_TRIGGERED'],
  evaluate(ctx) {
    const state: EvalCaseState = 'EVAL_TRIGGERED';
    if (ctx.evaluationCase.caseType !== 'DISMISSAL') {
      return pass(this.ruleCode, state, '34 CFR §300.503(a)', 'Not a dismissal case.');
    }
    const passed = hasPwnForCase(ctx);
    return {
      ruleCode: this.ruleCode,
      passed,
      severity: 'CRITICAL',
      legalReference: '34 CFR §300.503(a)',
      appliesTo: state,
      message: passed
        ? 'Prior Written Notice exists for the proposed dismissal.'
        : 'PWN is REQUIRED before proposing dismissal from special education services.',
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers & Exports
// ---------------------------------------------------------------------------

function pass(ruleCode: string, appliesTo: EvalCaseState, legalReference: string, message: string): EvalRuleResult {
  return { ruleCode, passed: true, severity: 'CRITICAL', legalReference, appliesTo, message };
}

export const ALL_EVAL_RULES: EvalRule[] = [
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
];
