// IDEA Evaluation Governance — Barrel Export

export {
  ALL_EVAL_RULES,
  REFERRAL_001, REFERRAL_002,
  EVAL_INIT_001, EVAL_INIT_002, EVAL_INIT_003, EVAL_INIT_004, EVAL_INIT_005, EVAL_INIT_006,
  REEVAL_001, DISMISS_001,
} from './eval-rules';
export type { EvalRule } from './eval-rules';

export {
  TRANSITIONS,
  getValidTransitions,
  isValidTransition,
  findTransition,
  evaluateTransition,
} from './eval-state-machine';

export {
  calculateDueDate,
  checkTimelineCompliance,
} from './timeline-engine';

export {
  US_FEDERAL, GA_OVERLAY, FL_OVERLAY, SC_OVERLAY, LA_OVERLAY,
  STATE_OVERLAYS, getOverlay,
} from './state-overlays';

export { validateOverlay, validateAllOverlays } from './overlay-invariant';

export { generatePwnDocument } from './pwn-generator';
export type { PwnParams, GeneratedPwn } from './pwn-generator';

export { generateConsentDocument } from './consent-generator';
export type { ConsentFormParams, GeneratedConsentForm } from './consent-generator';

export { generateEligibilityDocument } from './eligibility-generator';
export type { EligibilityReportParams, GeneratedEligibilityReport } from './eligibility-generator';

export {
  createCase,
  transitionCase,
  createEvaluationPlan,
  createAssignment,
  recordAssessment,
  recordConsent,
  scheduleEligibilityMeeting,
  recordEligibilityDecision,
  getCasesForStudent,
  getCase,
  getComplianceMetrics,
} from './evaluation.service';
