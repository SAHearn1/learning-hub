// ═══════════════════════════════════════════════════════════════
// IDEA Evaluation Governance Types (34 CFR §300.300–§300.311)
// ═══════════════════════════════════════════════════════════════

/** 12-state lifecycle of an evaluation case. */
export type EvalCaseState =
  | 'EVAL_TRIGGERED'
  | 'SAFEGUARDS_ISSUED'
  | 'SAFEGUARDS_REQUIRED'
  | 'CONSENT_REQUESTED'
  | 'CONSENT_RECEIVED'
  | 'CONSENT_REFUSED'
  | 'EVALUATION_PLANNED'
  | 'ASSESSMENTS_IN_PROGRESS'
  | 'ASSESSMENTS_COMPLETE'
  | 'ELIGIBILITY_MEETING'
  | 'ELIGIBILITY_DECISION'
  | 'CLOSED';

/** Type of evaluation case. */
export type EvalCaseType = 'INITIAL' | 'REEVALUATION' | 'DISMISSAL';

/** Type of consent requested. */
export type ConsentType =
  | 'INITIAL_EVALUATION'
  | 'REEVALUATION'
  | 'SERVICES'
  | 'RELEASE_OF_RECORDS';

/** Parent's consent decision. */
export type ConsentDecision = 'GRANTED' | 'REFUSED' | 'REVOKED';

/** Outcome of the eligibility determination. */
export type EligibilityOutcome = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'DISMISSED';

/** Assessment domains per 34 CFR §300.304(b). */
export type AssessmentDomain =
  | 'ACADEMIC_ACHIEVEMENT'
  | 'COGNITIVE'
  | 'COMMUNICATION'
  | 'SOCIAL_EMOTIONAL'
  | 'ADAPTIVE_BEHAVIOR'
  | 'MOTOR'
  | 'HEALTH'
  | 'VISION'
  | 'HEARING'
  | 'ASSISTIVE_TECHNOLOGY'
  | 'TRANSITION'
  | 'FUNCTIONAL_BEHAVIOR'
  | 'VOCATIONAL'
  | 'OTHER';

/** Timeline calculation unit. */
export type TimelineUnit = 'CALENDAR_DAYS' | 'SCHOOL_DAYS';

/** An evaluation case tracking the full referral → eligibility lifecycle. */
export type EvaluationCase = {
  id: string;
  tenantId: string;
  studentId: string;
  caseType: EvalCaseType;
  currentState: EvalCaseState;
  stateCode: string;
  referralSource: string | null;
  referralReason: string | null;
  referralDate: string | null;
  consentRequestedDate: string | null;
  consentReceivedDate: string | null;
  evaluationDueDate: string | null;
  eligibilityDate: string | null;
  closedDate: string | null;
  closedReason: string | null;
  correlationId: string;
  metadata: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** An immutable state transition record. */
export type EvalStateTransition = {
  id: string;
  tenantId: string;
  caseId: string;
  fromState: string;
  toState: string;
  transitionBy: string;
  reason: string | null;
  ruleResults: unknown | null;
  transitionHash: string;
  createdAt: string;
};

/** An evaluation plan specifying assessment domains. */
export type EvaluationPlan = {
  id: string;
  tenantId: string;
  caseId: string;
  assessmentDomains: AssessmentDomain[];
  planContent: string;
  planHash: string;
  artifactRef: string;
  createdBy: string;
  createdAt: string;
};

/** An evaluator assignment for a specific domain. */
export type EvaluationAssignment = {
  id: string;
  tenantId: string;
  caseId: string;
  assessorId: string;
  domain: AssessmentDomain;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** An immutable assessment result record. */
export type EvalAssessmentRecord = {
  id: string;
  tenantId: string;
  caseId: string;
  assignmentId: string | null;
  domain: AssessmentDomain;
  instrumentName: string;
  administeredBy: string;
  administeredDate: string;
  results: unknown;
  narrative: string | null;
  reportHash: string;
  artifactRef: string;
  createdAt: string;
};

/** An immutable consent record. */
export type EvalConsentRecord = {
  id: string;
  tenantId: string;
  caseId: string;
  consentType: ConsentType;
  decision: ConsentDecision;
  respondentId: string;
  respondentName: string;
  consentDate: string;
  documentHash: string;
  artifactRef: string;
  notes: string | null;
  createdAt: string;
};

/** An eligibility meeting record. */
export type EligibilityMeeting = {
  id: string;
  tenantId: string;
  caseId: string;
  scheduledDate: string;
  actualDate: string | null;
  attendees: { name: string; role: string }[];
  requiredRoles: string[];
  meetingNotes: string | null;
  meetingHash: string | null;
  createdAt: string;
  updatedAt: string;
};

/** An immutable eligibility decision. */
export type EligibilityDecision = {
  id: string;
  tenantId: string;
  caseId: string;
  outcome: EligibilityOutcome;
  disabilityCategory: string | null;
  rationale: string;
  decisionDate: string;
  decisionHash: string;
  artifactRef: string;
  decidedBy: string;
  createdAt: string;
};

/** State overlay defining jurisdiction-specific timeline rules. */
export type StateOverlay = {
  stateCode: string;
  stateName: string;
  evaluationTimelineDays: number;
  evaluationTimelineUnit: TimelineUnit;
  additionalRequiredMeetingRoles: string[];
};

/** Input context for evaluation compliance rules. */
export type EvalCaseContext = {
  evaluationCase: EvaluationCase;
  consents: EvalConsentRecord[];
  plan: EvaluationPlan | null;
  assignments: EvaluationAssignment[];
  assessments: EvalAssessmentRecord[];
  eligibilityMeeting: EligibilityMeeting | null;
  eligibilityDecision: EligibilityDecision | null;
  transitions: EvalStateTransition[];
  safeguardsNotices: { id: string; deliveryStatus: string; trigger: string }[];
  priorWrittenNotices: { id: string; caseId: string | null }[];
  previousEvaluations: { id: string; closedDate: string | null; createdAt: string }[];
  stateOverlay: StateOverlay;
  nowDate: string;
};

/** Severity levels for eval rule results. */
export type EvalRuleSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

/** Output of a single evaluation rule. */
export type EvalRuleResult = {
  ruleCode: string;
  passed: boolean;
  severity: EvalRuleSeverity;
  legalReference: string;
  message: string;
  appliesTo: EvalCaseState;
};

/** Aggregate output of the evaluation compliance validation. */
export type EvalValidationResult = {
  passed: boolean;
  caseId: string;
  currentState: EvalCaseState;
  rules: EvalRuleResult[];
};

/** A valid state transition definition. */
export type EvalTransition = {
  from: EvalCaseState;
  to: EvalCaseState;
  guardRules: string[];
};
