// IDEA Progress Monitoring — Barrel Export

export { ALL_PM_RULES, PM_001, PM_002, PM_003, PM_004, PM_005, PM_006, linearRegressionSlope } from './pm-rules';
export type { PmRule } from './pm-rules';

export { evaluateProgressMonitoring } from './pm-evaluator';

export { generateProgressReportDocument } from './report-generator';
export type { ProgressReportParams, GeneratedProgressReport } from './report-generator';

export {
  createGoal,
  activateGoal,
  updateGoalStatus,
  addProgressEntry,
  generateProgressReport,
  markReportDelivered,
  acknowledgeReport,
  getGoalsForStudent,
  getGoal,
  getEntriesForGoal,
  getReportsForGoal,
  checkComplianceForGoal,
} from './progress-monitoring.service';
