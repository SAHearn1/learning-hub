/**
 * Compliance Dashboard Aggregator
 *
 * District-level metrics aggregation across all compliance modules:
 * Safeguards (PSN), Progress Monitoring, Evaluations, Discipline.
 */

import { db } from '@/lib/db';
import { getCurrentSchoolYear } from '@/lib/safeguards/school-year';

/** Parse "YYYY-YYYY" school year string into start/end Date range. */
function schoolYearDateRange(schoolYear: string) {
  const [startYear, endYear] = schoolYear.split('-').map(Number);
  return {
    start: new Date(startYear, 6, 1), // July 1
    end: new Date(endYear, 5, 30),    // June 30
  };
}

export type ComplianceSnapshot = {
  tenantId: string;
  schoolYear: string;
  generatedAt: string;

  safeguards: {
    totalNotices: number;
    delivered: number;
    pending: number;
    acknowledged: number;
  };

  progressMonitoring: {
    totalGoals: number;
    activeGoals: number;
    missingMeasurementMethod: number;
    missingReportingFrequency: number;
  };

  evaluations: {
    totalCases: number;
    openCases: number;
    overdueCases: number;
    awaitingConsent: number;
    missingPlan: number;
  };

  discipline: {
    totalRemovals: number;
    openCases: number;
    changeOfPlacement: number;
    pendingMdr: number;
  };

  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
};

/**
 * Aggregate compliance metrics across all modules for a tenant.
 */
export async function generateComplianceSnapshot(
  tenantId: string,
): Promise<ComplianceSnapshot> {
  const schoolYear = getCurrentSchoolYear();
  const { start: syStart, end: syEnd } = schoolYearDateRange(schoolYear);

  // Run all queries in parallel
  const [
    // Safeguards
    totalNotices,
    deliveredNotices,
    pendingNotices,
    acknowledgedNotices,
    // Progress Monitoring
    totalGoals,
    activeGoals,
    missingMethod,
    missingFrequency,
    // Evaluations
    totalEvalCases,
    openEvalCases,
    overdueEvalCases,
    awaitingConsent,
    missingPlan,
    // Discipline
    totalRemovals,
    openDisciplineCases,
    copCases,
    pendingMdr,
  ] = await Promise.all([
    // Safeguards
    db.safeguardsNotice.count({ where: { tenantId } }),
    db.safeguardsNotice.count({
      where: { tenantId, deliveryStatus: 'DELIVERED' },
    }),
    db.safeguardsNotice.count({
      where: { tenantId, deliveryStatus: 'GENERATED' },
    }),
    db.safeguardsNotice.count({
      where: { tenantId, deliveryStatus: 'ACKNOWLEDGED' },
    }),
    // Progress Monitoring
    db.iepGoal.count({ where: { tenantId } }),
    db.iepGoal.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.iepGoal.count({
      where: { tenantId, status: 'ACTIVE', measurementMethod: null },
    }),
    db.iepGoal.count({
      where: { tenantId, status: 'ACTIVE', reportingFrequency: null },
    }),
    // Evaluations
    db.evaluationCase.count({ where: { tenantId } }),
    db.evaluationCase.count({
      where: { tenantId, currentState: { not: 'CLOSED' } },
    }),
    db.evaluationCase.count({
      where: {
        tenantId,
        currentState: { not: 'CLOSED' },
        evaluationDueDate: { lt: new Date() },
      },
    }),
    db.evaluationCase.count({
      where: { tenantId, currentState: 'CONSENT_REQUESTED' },
    }),
    db.evaluationCase.count({
      where: {
        tenantId,
        currentState: { in: ['CONSENT_RECEIVED', 'EVALUATION_PLANNED'] },
        plan: { is: null },
      },
    }),
    // Discipline
    db.disciplineCase.count({
      where: {
        tenantId,
        removalStartDate: { gte: syStart, lte: syEnd },
      },
    }),
    db.disciplineCase.count({
      where: { tenantId, currentState: { not: 'CLOSED' } },
    }),
    db.disciplineCase.count({
      where: { tenantId, isChangeOfPlacement: true },
    }),
    db.disciplineCase.count({
      where: {
        tenantId,
        isChangeOfPlacement: true,
        manifestDetermination: { is: null },
        currentState: { not: 'CLOSED' },
      },
    }),
  ]);

  // Calculate risk score (0–100)
  const criticalViolations =
    missingMethod +
    missingFrequency +
    overdueEvalCases +
    missingPlan +
    pendingMdr;
  const warningViolations = pendingNotices + awaitingConsent;

  const riskScore = Math.min(
    100,
    criticalViolations * 15 + warningViolations * 5,
  );

  const riskLevel: ComplianceSnapshot['riskLevel'] =
    riskScore >= 60
      ? 'CRITICAL'
      : riskScore >= 30
        ? 'HIGH'
        : riskScore >= 10
          ? 'MODERATE'
          : 'LOW';

  return {
    tenantId,
    schoolYear,
    generatedAt: new Date().toISOString(),

    safeguards: {
      totalNotices,
      delivered: deliveredNotices,
      pending: pendingNotices,
      acknowledged: acknowledgedNotices,
    },

    progressMonitoring: {
      totalGoals,
      activeGoals,
      missingMeasurementMethod: missingMethod,
      missingReportingFrequency: missingFrequency,
    },

    evaluations: {
      totalCases: totalEvalCases,
      openCases: openEvalCases,
      overdueCases: overdueEvalCases,
      awaitingConsent,
      missingPlan,
    },

    discipline: {
      totalRemovals,
      openCases: openDisciplineCases,
      changeOfPlacement: copCases,
      pendingMdr,
    },

    riskScore,
    riskLevel,
  };
}
