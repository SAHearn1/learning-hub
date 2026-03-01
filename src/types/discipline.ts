// ═══════════════════════════════════════════════════════════════
// IDEA Discipline Protections Types (34 CFR §300.530–§300.536)
// ═══════════════════════════════════════════════════════════════

/** States for a discipline case. */
export type DisciplineCaseState =
  | 'REMOVAL_RECORDED'
  | 'THRESHOLD_REVIEW'
  | 'MDR_PENDING'
  | 'MDR_COMPLETE'
  | 'PLACEMENT_DETERMINED'
  | 'SERVICES_IN_PROGRESS'
  | 'CLOSED';

/** Type of removal. */
export type RemovalType =
  | 'IN_SCHOOL_SUSPENSION'
  | 'OUT_OF_SCHOOL_SUSPENSION'
  | 'EXPULSION'
  | 'BUS_SUSPENSION'
  | 'OTHER';

/** Outcome of a manifestation determination review. */
export type ManifestOutcome = 'IS_MANIFESTATION' | 'NOT_MANIFESTATION';

/** Type of placement during discipline. */
export type PlacementType =
  | 'RETURN_TO_PLACEMENT'
  | 'IAES'
  | 'ALTERNATIVE_SETTING'
  | 'HOME_INSTRUCTION';

/** A discipline case record. */
export type DisciplineCase = {
  id: string;
  tenantId: string;
  studentId: string;
  currentState: DisciplineCaseState;
  removalType: RemovalType;
  removalStartDate: string;
  removalEndDate: string | null;
  removalDays: number;
  cumulativeRemovalDays: number;
  isChangeOfPlacement: boolean;
  currentPlacement: PlacementType | null;
  iaesEndDate: string | null;
  servicesDescription: string | null;
  servicesContinued: boolean;
  incidentDescription: string;
  closedDate: string | null;
  closedReason: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** A manifestation determination review record. */
export type ManifestDetermination = {
  id: string;
  tenantId: string;
  caseId: string;
  meetingDate: string;
  attendees: { name: string; role: string }[];
  outcome: ManifestOutcome;
  rationale: string;
  conductRelated: boolean;
  disabilityRelated: boolean;
  iepImplemented: boolean;
  documentHash: string;
  artifactRef: string;
  decidedBy: string;
  createdAt: string;
};

/** Input context for discipline compliance rules. */
export type DisciplineContext = {
  disciplineCase: DisciplineCase;
  manifestDetermination: ManifestDetermination | null;
  /** All discipline cases for this student in the current school year. */
  schoolYearCases: DisciplineCase[];
  /** Whether PSN has been delivered for this change of placement. */
  psnDelivered: boolean;
  /** Whether IEP services were documented as continuing. */
  servicesDocumented: boolean;
  nowDate: string;
};

/** Severity levels for discipline rule results. */
export type DiscRuleSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

/** Output of a single discipline rule. */
export type DiscRuleResult = {
  ruleCode: string;
  passed: boolean;
  severity: DiscRuleSeverity;
  legalReference: string;
  message: string;
};

/** Aggregate output of discipline compliance validation. */
export type DiscValidationResult = {
  passed: boolean;
  caseId: string;
  currentState: DisciplineCaseState;
  rules: DiscRuleResult[];
};
