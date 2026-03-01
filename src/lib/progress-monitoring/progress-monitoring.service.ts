/**
 * Progress Monitoring Service
 *
 * CRUD operations for IepGoals, GoalProgressEntries, and ProgressReports.
 * Follows the same db import + audit pattern used across the codebase.
 */

import crypto from 'crypto';
import { db } from '@/lib/db';
import { appendImmutableAuditLog } from '@/lib/audit';
import { generateProgressReportDocument } from './report-generator';
import { evaluateProgressMonitoring } from './pm-evaluator';
import { linearRegressionSlope } from './pm-rules';
import type {
  IepGoalStatus,
  MeasurementMethod,
  ReportingFrequency,
  TrendDirection,
  ProgressMonitoringContext,
  ProgressMonitoringValidationResult,
} from '@/types/progress-monitoring';

// ---------------------------------------------------------------------------
// Create Goal
// ---------------------------------------------------------------------------
export type CreateGoalParams = {
  tenantId: string;
  studentId: string;
  goalCode: string;
  description: string;
  baselineValue: number;
  baselineDate: string;
  targetValue: number;
  targetDate: string;
  measurementMethod?: MeasurementMethod | null;
  measurementUnit?: string | null;
  reportingFrequency?: ReportingFrequency | null;
  monitoringIntervalDays?: number;
  createdBy: string;
};

export async function createGoal(params: CreateGoalParams) {
  const goal = await db.iepGoal.create({
    data: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      goalCode: params.goalCode,
      description: params.description,
      baselineValue: params.baselineValue,
      baselineDate: new Date(params.baselineDate),
      targetValue: params.targetValue,
      targetDate: new Date(params.targetDate),
      measurementMethod: params.measurementMethod as any ?? undefined,
      measurementUnit: params.measurementUnit,
      reportingFrequency: params.reportingFrequency as any ?? undefined,
      monitoringIntervalDays: params.monitoringIntervalDays ?? 30,
      status: 'DRAFT',
      createdBy: params.createdBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.createdBy,
    action: 'IEP_GOAL_CREATED',
    resource: 'IepGoal',
    resourceId: goal.id,
    metadata: { goalCode: params.goalCode },
  });

  return goal;
}

// ---------------------------------------------------------------------------
// Activate Goal
// ---------------------------------------------------------------------------
export async function activateGoal(goalId: string, userId: string) {
  const goal = await db.iepGoal.update({
    where: { id: goalId },
    data: {
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });

  await appendImmutableAuditLog({
    tenantId: goal.tenantId,
    userId,
    action: 'IEP_GOAL_ACTIVATED',
    resource: 'IepGoal',
    resourceId: goal.id,
    metadata: { goalCode: goal.goalCode },
  });

  return goal;
}

// ---------------------------------------------------------------------------
// Update Goal Status
// ---------------------------------------------------------------------------
export async function updateGoalStatus(
  goalId: string,
  status: IepGoalStatus,
  userId: string,
) {
  const data: Record<string, unknown> = { status };
  if (status === 'ACTIVE') data.activatedAt = new Date();
  if (status === 'COMPLETED' || status === 'DISCONTINUED') data.completedAt = new Date();

  const goal = await db.iepGoal.update({
    where: { id: goalId },
    data: data as any,
  });

  await appendImmutableAuditLog({
    tenantId: goal.tenantId,
    userId,
    action: `IEP_GOAL_STATUS_${status}`,
    resource: 'IepGoal',
    resourceId: goal.id,
    metadata: { goalCode: goal.goalCode, newStatus: status },
  });

  return goal;
}

// ---------------------------------------------------------------------------
// Add Progress Entry (append-only, SHA-256 hash)
// ---------------------------------------------------------------------------
export type AddEntryParams = {
  tenantId: string;
  goalId: string;
  studentId: string;
  recordedValue: number;
  measurementMethod: MeasurementMethod;
  observationDate: string;
  notes?: string | null;
  recordedBy: string;
};

export async function addProgressEntry(params: AddEntryParams) {
  const entryHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        goalId: params.goalId,
        studentId: params.studentId,
        recordedValue: params.recordedValue,
        measurementMethod: params.measurementMethod,
        observationDate: params.observationDate,
        recordedBy: params.recordedBy,
        timestamp: new Date().toISOString(),
      }),
    )
    .digest('hex');

  const entry = await db.goalProgressEntry.create({
    data: {
      tenantId: params.tenantId,
      goalId: params.goalId,
      studentId: params.studentId,
      recordedValue: params.recordedValue,
      measurementMethod: params.measurementMethod as any,
      observationDate: new Date(params.observationDate),
      notes: params.notes,
      entryHash,
      recordedBy: params.recordedBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.recordedBy,
    action: 'PROGRESS_ENTRY_RECORDED',
    resource: 'GoalProgressEntry',
    resourceId: entry.id,
    metadata: {
      goalId: params.goalId,
      recordedValue: params.recordedValue,
      entryHash,
    },
  });

  return entry;
}

// ---------------------------------------------------------------------------
// Generate Progress Report (deterministic HTML + hash)
// ---------------------------------------------------------------------------
export type GenerateReportParams = {
  tenantId: string;
  goalId: string;
  studentId: string;
  studentName: string;
  districtName: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  generatedBy: string;
};

export async function generateProgressReport(params: GenerateReportParams) {
  const goal = await db.iepGoal.findUniqueOrThrow({
    where: { id: params.goalId },
  });

  const entries = await db.goalProgressEntry.findMany({
    where: {
      goalId: params.goalId,
      observationDate: {
        gte: new Date(params.reportingPeriodStart),
        lte: new Date(params.reportingPeriodEnd),
      },
    },
    orderBy: { observationDate: 'asc' },
  });

  // Compute trend
  const baseDate = entries.length > 0
    ? new Date(entries[0].observationDate).getTime()
    : Date.now();
  const msPerDay = 86_400_000;
  const points = entries.map((e) => ({
    x: (new Date(e.observationDate).getTime() - baseDate) / msPerDay,
    y: e.recordedValue,
  }));

  const slope = linearRegressionSlope(points);
  let trendDirection: TrendDirection = 'FLAT';
  if (slope !== null) {
    if (slope > 0.001) trendDirection = 'IMPROVING';
    else if (slope < -0.001) trendDirection = 'DECLINING';
  }

  const currentValue = entries.length > 0
    ? entries[entries.length - 1].recordedValue
    : goal.baselineValue;

  const { content, reportHash } = generateProgressReportDocument({
    goalCode: goal.goalCode,
    goalDescription: goal.description,
    studentName: params.studentName,
    districtName: params.districtName,
    reportingPeriodStart: params.reportingPeriodStart,
    reportingPeriodEnd: params.reportingPeriodEnd,
    baselineValue: goal.baselineValue,
    targetValue: goal.targetValue,
    currentValue,
    measurementUnit: goal.measurementUnit ?? 'units',
    entryCount: entries.length,
    trendDirection,
    trendSlope: slope,
  });

  const artifactRef = `pm-report://${params.tenantId}/${params.goalId}/${reportHash}`;

  const report = await db.progressReport.create({
    data: {
      tenantId: params.tenantId,
      goalId: params.goalId,
      studentId: params.studentId,
      reportingPeriodStart: new Date(params.reportingPeriodStart),
      reportingPeriodEnd: new Date(params.reportingPeriodEnd),
      entryCount: entries.length,
      currentValue,
      baselineValue: goal.baselineValue,
      targetValue: goal.targetValue,
      trendDirection,
      trendSlope: slope,
      reportContent: content,
      reportHash,
      artifactRef,
      deliveryStatus: 'GENERATED',
      generatedBy: params.generatedBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.generatedBy,
    action: 'PROGRESS_REPORT_GENERATED',
    resource: 'ProgressReport',
    resourceId: report.id,
    metadata: {
      goalId: params.goalId,
      reportHash,
      entryCount: entries.length,
      trendDirection,
    },
  });

  return { report, content };
}

// ---------------------------------------------------------------------------
// Mark Report Delivered
// ---------------------------------------------------------------------------
export async function markReportDelivered(reportId: string, userId: string) {
  const report = await db.progressReport.update({
    where: { id: reportId },
    data: {
      deliveryStatus: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });

  await appendImmutableAuditLog({
    tenantId: report.tenantId,
    userId,
    action: 'PROGRESS_REPORT_DELIVERED',
    resource: 'ProgressReport',
    resourceId: report.id,
  });

  return report;
}

// ---------------------------------------------------------------------------
// Acknowledge Report (parent action)
// ---------------------------------------------------------------------------
export async function acknowledgeReport(reportId: string, acknowledgedBy: string) {
  const report = await db.progressReport.update({
    where: { id: reportId },
    data: {
      deliveryStatus: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: report.tenantId,
    userId: acknowledgedBy,
    action: 'PROGRESS_REPORT_ACKNOWLEDGED',
    resource: 'ProgressReport',
    resourceId: report.id,
  });

  return report;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------
export async function getGoalsForStudent(tenantId: string, studentId: string) {
  return db.iepGoal.findMany({
    where: { tenantId, studentId },
    include: { entries: { orderBy: { observationDate: 'desc' }, take: 5 }, reports: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getGoal(goalId: string) {
  return db.iepGoal.findUniqueOrThrow({
    where: { id: goalId },
    include: { entries: { orderBy: { observationDate: 'desc' } }, reports: { orderBy: { createdAt: 'desc' } } },
  });
}

export async function getEntriesForGoal(goalId: string) {
  return db.goalProgressEntry.findMany({
    where: { goalId },
    orderBy: { observationDate: 'desc' },
  });
}

export async function getReportsForGoal(goalId: string) {
  return db.progressReport.findMany({
    where: { goalId },
    orderBy: { createdAt: 'desc' },
  });
}

// ---------------------------------------------------------------------------
// Compliance Check
// ---------------------------------------------------------------------------
export async function checkComplianceForGoal(
  goalId: string,
  nowDate?: string,
): Promise<ProgressMonitoringValidationResult> {
  const goal = await db.iepGoal.findUniqueOrThrow({
    where: { id: goalId },
    include: {
      entries: { orderBy: { observationDate: 'asc' } },
      reports: { orderBy: { createdAt: 'asc' } },
    },
  });

  const ctx: ProgressMonitoringContext = {
    goal: {
      id: goal.id,
      tenantId: goal.tenantId,
      studentId: goal.studentId,
      goalCode: goal.goalCode,
      description: goal.description,
      baselineValue: goal.baselineValue,
      baselineDate: goal.baselineDate.toISOString(),
      targetValue: goal.targetValue,
      targetDate: goal.targetDate.toISOString(),
      measurementMethod: goal.measurementMethod as any,
      measurementUnit: goal.measurementUnit,
      reportingFrequency: goal.reportingFrequency as any,
      monitoringIntervalDays: goal.monitoringIntervalDays,
      status: goal.status as any,
      activatedAt: goal.activatedAt?.toISOString() ?? null,
      completedAt: goal.completedAt?.toISOString() ?? null,
      createdBy: goal.createdBy,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    },
    entries: goal.entries.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      goalId: e.goalId,
      studentId: e.studentId,
      recordedValue: e.recordedValue,
      measurementMethod: e.measurementMethod as any,
      observationDate: e.observationDate.toISOString(),
      notes: e.notes,
      entryHash: e.entryHash,
      recordedBy: e.recordedBy,
      createdAt: e.createdAt.toISOString(),
    })),
    reports: goal.reports.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      goalId: r.goalId,
      studentId: r.studentId,
      reportingPeriodStart: r.reportingPeriodStart.toISOString(),
      reportingPeriodEnd: r.reportingPeriodEnd.toISOString(),
      entryCount: r.entryCount,
      currentValue: r.currentValue,
      baselineValue: r.baselineValue,
      targetValue: r.targetValue,
      trendDirection: r.trendDirection as any,
      trendSlope: r.trendSlope,
      reportContent: r.reportContent,
      reportHash: r.reportHash,
      artifactRef: r.artifactRef,
      deliveryStatus: r.deliveryStatus as any,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: r.acknowledgedBy,
      generatedBy: r.generatedBy,
      createdAt: r.createdAt.toISOString(),
    })),
    nowDate: nowDate ?? new Date().toISOString(),
  };

  return evaluateProgressMonitoring(ctx);
}
