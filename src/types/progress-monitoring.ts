// ═══════════════════════════════════════════════════════════════
// IDEA Progress Monitoring Types (34 CFR §300.320(a)(3))
// ═══════════════════════════════════════════════════════════════

/** Status of an IEP goal through its lifecycle. */
export type IepGoalStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';

/** Method used to measure goal progress. */
export type MeasurementMethod =
  | 'CURRICULUM_BASED'
  | 'OBSERVATION'
  | 'RUBRIC'
  | 'STANDARDIZED_ASSESSMENT'
  | 'WORK_SAMPLE'
  | 'DATA_COLLECTION';

/** How often progress is reported to parents. */
export type ReportingFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'TRIMESTER'
  | 'SEMESTER';

/** Lifecycle status of a progress report delivery. */
export type ProgressReportDelivery =
  | 'PENDING'
  | 'GENERATED'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'FAILED';

/** Direction of progress trend based on linear regression. */
export type TrendDirection = 'IMPROVING' | 'FLAT' | 'DECLINING';

/** An IEP goal with measurable targets. */
export type IepGoal = {
  id: string;
  tenantId: string;
  studentId: string;
  goalCode: string;
  description: string;
  baselineValue: number;
  baselineDate: string;
  targetValue: number;
  targetDate: string;
  measurementMethod: MeasurementMethod | null;
  measurementUnit: string | null;
  reportingFrequency: ReportingFrequency | null;
  monitoringIntervalDays: number;
  status: IepGoalStatus;
  activatedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** An append-only progress data point for a goal. */
export type GoalProgressEntry = {
  id: string;
  tenantId: string;
  goalId: string;
  studentId: string;
  recordedValue: number;
  measurementMethod: MeasurementMethod;
  observationDate: string;
  notes: string | null;
  entryHash: string;
  recordedBy: string;
  createdAt: string;
};

/** An immutable progress report generated for a reporting period. */
export type ProgressReport = {
  id: string;
  tenantId: string;
  goalId: string;
  studentId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  entryCount: number;
  currentValue: number;
  baselineValue: number;
  targetValue: number;
  trendDirection: TrendDirection;
  trendSlope: number | null;
  reportContent: string;
  reportHash: string;
  artifactRef: string;
  deliveryStatus: ProgressReportDelivery;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  generatedBy: string;
  createdAt: string;
};

/** Input context for progress monitoring compliance rules. */
export type ProgressMonitoringContext = {
  goal: IepGoal;
  entries: GoalProgressEntry[];
  reports: ProgressReport[];
  nowDate: string;
};

/** Severity levels for PM rule results. */
export type PmRuleSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

/** Output of a single progress monitoring rule. */
export type ProgressMonitoringRuleResult = {
  ruleCode: string;
  passed: boolean;
  severity: PmRuleSeverity;
  legalReference: string;
  message: string;
};

/** Aggregate output of the PM compliance validation. */
export type ProgressMonitoringValidationResult = {
  passed: boolean;
  goalId: string;
  rules: ProgressMonitoringRuleResult[];
};
