// ═══════════════════════════════════════════════════════════════
// IDEA Procedural Safeguards Notice (34 CFR §300.504)
// ═══════════════════════════════════════════════════════════════

/** The 6 mandatory trigger points for issuing the Procedural Safeguards Notice. */
export type SafeguardsTrigger =
  | 'ANNUAL_NOTICE'
  | 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST'
  | 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR'
  | 'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR'
  | 'DISCIPLINARY_CHANGE_OF_PLACEMENT'
  | 'PARENT_REQUEST';

/** Events that may trigger PSN issuance obligations. */
export type ProceduralEventType =
  | 'REFERRAL_RECEIVED'
  | 'PARENT_EVAL_REQUEST'
  | 'STATE_COMPLAINT_FILED'
  | 'DUE_PROCESS_COMPLAINT_FILED'
  | 'DISCIPLINARY_PLACEMENT_CHANGE'
  | 'PARENT_SAFEGUARDS_REQUEST'
  | 'ANNUAL_NOTICE_DUE';

/** Delivery channel for the safeguards notice. */
export type DeliveryMethod = 'PORTAL' | 'EMAIL' | 'MAIL' | 'HAND_DELIVERED';

/** Lifecycle status of a safeguards notice. */
export type DeliveryStatus = 'PENDING' | 'GENERATED' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED';

/** A recorded procedural event that may trigger PSN issuance. */
export type ProceduralEvent = {
  id: string;
  tenantId: string;
  studentId: string;
  caseId: string | null;
  eventType: ProceduralEventType;
  trigger: SafeguardsTrigger;
  schoolYear: string;
  correlationId: string;
  isFirstOfType: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
};

/** An issued Procedural Safeguards Notice with delivery evidence. */
export type SafeguardsNotice = {
  id: string;
  tenantId: string;
  studentId: string;
  caseId: string | null;
  proceduralEventId: string;
  trigger: SafeguardsTrigger;
  deliveryMethod: DeliveryMethod;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  noticeDocHash: string;
  artifactRef: string;
  schoolYear: string;
  createdAt: string;
};

/** Input context for PSN validation rules. */
export type ProceduralSafeguardsContext = {
  trigger: SafeguardsTrigger;
  studentId: string;
  schoolYear: string;
  caseId?: string | null;
  existingNotices: SafeguardsNotice[];
  existingEvents: ProceduralEvent[];
  proceduralEventId?: string;
};

/** Severity levels for PSN rule results. */
export type PsnRuleSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

/** Output of a single PSN validation rule. */
export type ProceduralSafeguardsRuleResult = {
  ruleCode: string;
  passed: boolean;
  severity: PsnRuleSeverity;
  legalReference: string;
  message: string;
};

/** Aggregate output of the PSN validation gate. */
export type ProceduralSafeguardsValidationResult = {
  passed: boolean;
  trigger: SafeguardsTrigger;
  rules: ProceduralSafeguardsRuleResult[];
};

/** Workflow actions that may trigger PSN obligations. */
export type PsnWorkflowAction =
  | 'INITIAL_REFERRAL'
  | 'PARENT_REQUEST_EVALUATION'
  | 'DISCIPLINARY_PLACEMENT'
  | 'STATE_COMPLAINT_FILED'
  | 'DUE_PROCESS_COMPLAINT_FILED'
  | 'PARENT_REQUEST_SAFEGUARDS'
  | 'ANNUAL_SAFEGUARDS_DUE';
