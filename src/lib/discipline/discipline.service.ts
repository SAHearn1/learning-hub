/**
 * Discipline Protections Service
 *
 * CRUD + compliance checks for discipline cases under 34 CFR §300.530–536.
 */

import crypto from 'crypto';
import { db } from '@/lib/db';
import { appendImmutableAuditLog } from '@/lib/audit';
import { getCurrentSchoolYear } from '@/lib/safeguards/school-year';
import { evaluateDisciplineCompliance } from './disc-evaluator';

/** Parse "YYYY-YYYY" school year string into start/end Date range. */
function schoolYearDateRange(schoolYear: string) {
  const [startYear, endYear] = schoolYear.split('-').map(Number);
  return {
    start: new Date(startYear, 6, 1), // July 1
    end: new Date(endYear, 5, 30),    // June 30
  };
}

import type {
  DisciplineContext,
  DisciplineCase,
  ManifestOutcome,
  RemovalType,
  PlacementType,
} from '@/types/discipline';

// ---------------------------------------------------------------------------
// Create Case
// ---------------------------------------------------------------------------

export type CreateDisciplineCaseParams = {
  tenantId: string;
  studentId: string;
  removalType: RemovalType;
  removalStartDate: string;
  removalEndDate?: string;
  removalDays: number;
  incidentDescription: string;
  createdBy: string;
};

export async function createDisciplineCase(params: CreateDisciplineCaseParams) {
  const schoolYear = getCurrentSchoolYear();
  const { start: syStart, end: syEnd } = schoolYearDateRange(schoolYear);

  // Calculate cumulative removal days for the school year
  const existingCases = await db.disciplineCase.findMany({
    where: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      removalStartDate: { gte: syStart, lte: syEnd },
    },
  });

  const cumulativePrior = existingCases.reduce(
    (sum, c) => sum + c.removalDays,
    0,
  );
  const cumulativeTotal = cumulativePrior + params.removalDays;
  const isChangeOfPlacement =
    cumulativeTotal > 10 || params.removalDays > 10;

  const disciplineCase = await db.disciplineCase.create({
    data: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      removalType: params.removalType as any,
      removalStartDate: new Date(params.removalStartDate),
      removalEndDate: params.removalEndDate
        ? new Date(params.removalEndDate)
        : null,
      removalDays: params.removalDays,
      cumulativeRemovalDays: cumulativeTotal,
      isChangeOfPlacement,
      incidentDescription: params.incidentDescription,
      currentState: isChangeOfPlacement
        ? 'THRESHOLD_REVIEW'
        : 'REMOVAL_RECORDED',
      createdBy: params.createdBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.createdBy,
    action: 'DISCIPLINE_CASE_CREATED',
    resource: 'DisciplineCase',
    resourceId: disciplineCase.id,
    metadata: {
      removalType: params.removalType,
      removalDays: params.removalDays,
      cumulativeTotal,
      isChangeOfPlacement,
    },
  });

  return disciplineCase;
}

// ---------------------------------------------------------------------------
// Record Manifestation Determination
// ---------------------------------------------------------------------------

export type RecordMdrParams = {
  tenantId: string;
  caseId: string;
  meetingDate: string;
  attendees: { name: string; role: string }[];
  outcome: ManifestOutcome;
  rationale: string;
  conductRelated: boolean;
  disabilityRelated: boolean;
  iepImplemented: boolean;
  decidedBy: string;
};

export async function recordManifestDetermination(params: RecordMdrParams) {
  const docContent = JSON.stringify({
    caseId: params.caseId,
    meetingDate: params.meetingDate,
    outcome: params.outcome,
    rationale: params.rationale,
    attendees: params.attendees,
  });
  const documentHash = crypto
    .createHash('sha256')
    .update(docContent)
    .digest('hex');

  const mdr = await db.manifestDetermination.create({
    data: {
      tenantId: params.tenantId,
      caseId: params.caseId,
      meetingDate: new Date(params.meetingDate),
      attendees: params.attendees as any,
      outcome: params.outcome as any,
      rationale: params.rationale,
      conductRelated: params.conductRelated,
      disabilityRelated: params.disabilityRelated,
      iepImplemented: params.iepImplemented,
      documentHash,
      artifactRef: `mdr://${params.tenantId}/${params.caseId}/${documentHash}`,
      decidedBy: params.decidedBy,
    },
  });

  // Advance case state
  await db.disciplineCase.update({
    where: { id: params.caseId },
    data: { currentState: 'MDR_COMPLETE' },
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.decidedBy,
    action: 'MDR_RECORDED',
    resource: 'ManifestDetermination',
    resourceId: mdr.id,
    metadata: { outcome: params.outcome, documentHash },
  });

  return mdr;
}

// ---------------------------------------------------------------------------
// Set Placement
// ---------------------------------------------------------------------------

export async function setPlacement(
  caseId: string,
  placement: PlacementType,
  iaesEndDate: string | null,
  userId: string,
) {
  const updated = await db.disciplineCase.update({
    where: { id: caseId },
    data: {
      currentPlacement: placement as any,
      iaesEndDate: iaesEndDate ? new Date(iaesEndDate) : null,
      currentState: 'PLACEMENT_DETERMINED',
    },
  });

  await appendImmutableAuditLog({
    tenantId: updated.tenantId,
    userId,
    action: 'PLACEMENT_SET',
    resource: 'DisciplineCase',
    resourceId: caseId,
    metadata: { placement, iaesEndDate },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Document Services Continuation
// ---------------------------------------------------------------------------

export async function documentServicesContinuation(
  caseId: string,
  servicesDescription: string,
  userId: string,
) {
  const updated = await db.disciplineCase.update({
    where: { id: caseId },
    data: {
      servicesContinued: true,
      servicesDescription,
      currentState: 'SERVICES_IN_PROGRESS',
    },
  });

  await appendImmutableAuditLog({
    tenantId: updated.tenantId,
    userId,
    action: 'SERVICES_DOCUMENTED',
    resource: 'DisciplineCase',
    resourceId: caseId,
    metadata: { servicesDescription },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Close Case
// ---------------------------------------------------------------------------

export async function closeDisciplineCase(
  caseId: string,
  reason: string,
  userId: string,
) {
  const updated = await db.disciplineCase.update({
    where: { id: caseId },
    data: {
      currentState: 'CLOSED',
      closedDate: new Date(),
      closedReason: reason,
    },
  });

  await appendImmutableAuditLog({
    tenantId: updated.tenantId,
    userId,
    action: 'DISCIPLINE_CASE_CLOSED',
    resource: 'DisciplineCase',
    resourceId: caseId,
    metadata: { reason },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getCasesForStudent(
  tenantId: string,
  studentId: string,
) {
  return db.disciplineCase.findMany({
    where: { tenantId, studentId },
    include: { manifestDetermination: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCase(caseId: string) {
  return db.disciplineCase.findUnique({
    where: { id: caseId },
    include: { manifestDetermination: true },
  });
}

// ---------------------------------------------------------------------------
// Compliance Check
// ---------------------------------------------------------------------------

export async function checkDisciplineCompliance(
  tenantId: string,
  caseId: string,
) {
  const dCase = await db.disciplineCase.findUnique({
    where: { id: caseId },
    include: { manifestDetermination: true },
  });

  if (!dCase || dCase.tenantId !== tenantId) {
    throw new Error('Discipline case not found');
  }

  const schoolYear = getCurrentSchoolYear();
  const { start: syStart2, end: syEnd2 } = schoolYearDateRange(schoolYear);

  const schoolYearCases = await db.disciplineCase.findMany({
    where: {
      tenantId,
      studentId: dCase.studentId,
      removalStartDate: { gte: syStart2, lte: syEnd2 },
    },
  });

  // Check if PSN was delivered for this student's change of placement
  const psnRecord = dCase.isChangeOfPlacement
    ? await db.safeguardsNotice.findFirst({
        where: {
          tenantId,
          studentId: dCase.studentId,
          deliveryStatus: { in: ['DELIVERED', 'ACKNOWLEDGED'] },
        },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  const ctx: DisciplineContext = {
    disciplineCase: {
      id: dCase.id,
      tenantId: dCase.tenantId,
      studentId: dCase.studentId,
      currentState: dCase.currentState,
      removalType: dCase.removalType,
      removalStartDate: dCase.removalStartDate.toISOString(),
      removalEndDate: dCase.removalEndDate?.toISOString() ?? null,
      removalDays: dCase.removalDays,
      cumulativeRemovalDays: dCase.cumulativeRemovalDays,
      isChangeOfPlacement: dCase.isChangeOfPlacement,
      currentPlacement: dCase.currentPlacement,
      iaesEndDate: dCase.iaesEndDate?.toISOString() ?? null,
      servicesDescription: dCase.servicesDescription,
      servicesContinued: dCase.servicesContinued,
      incidentDescription: dCase.incidentDescription,
      closedDate: dCase.closedDate?.toISOString() ?? null,
      closedReason: dCase.closedReason,
      metadata: dCase.metadata as Record<string, unknown> | null,
      createdBy: dCase.createdBy,
      createdAt: dCase.createdAt.toISOString(),
      updatedAt: dCase.updatedAt.toISOString(),
    },
    manifestDetermination: dCase.manifestDetermination
      ? {
          id: dCase.manifestDetermination.id,
          tenantId: dCase.manifestDetermination.tenantId,
          caseId: dCase.manifestDetermination.caseId,
          meetingDate: dCase.manifestDetermination.meetingDate.toISOString(),
          attendees: dCase.manifestDetermination.attendees as { name: string; role: string }[],
          outcome: dCase.manifestDetermination.outcome,
          rationale: dCase.manifestDetermination.rationale,
          conductRelated: dCase.manifestDetermination.conductRelated,
          disabilityRelated: dCase.manifestDetermination.disabilityRelated,
          iepImplemented: dCase.manifestDetermination.iepImplemented,
          documentHash: dCase.manifestDetermination.documentHash,
          artifactRef: dCase.manifestDetermination.artifactRef,
          decidedBy: dCase.manifestDetermination.decidedBy,
          createdAt: dCase.manifestDetermination.createdAt.toISOString(),
        }
      : null,
    schoolYearCases: schoolYearCases.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      studentId: c.studentId,
      currentState: c.currentState,
      removalType: c.removalType,
      removalStartDate: c.removalStartDate.toISOString(),
      removalEndDate: c.removalEndDate?.toISOString() ?? null,
      removalDays: c.removalDays,
      cumulativeRemovalDays: c.cumulativeRemovalDays,
      isChangeOfPlacement: c.isChangeOfPlacement,
      currentPlacement: c.currentPlacement,
      iaesEndDate: c.iaesEndDate?.toISOString() ?? null,
      servicesDescription: c.servicesDescription,
      servicesContinued: c.servicesContinued,
      incidentDescription: c.incidentDescription,
      closedDate: c.closedDate?.toISOString() ?? null,
      closedReason: c.closedReason,
      metadata: c.metadata as Record<string, unknown> | null,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    psnDelivered: psnRecord !== null,
    servicesDocumented: dCase.servicesContinued,
    nowDate: new Date().toISOString(),
  };

  return evaluateDisciplineCompliance(ctx);
}

// ---------------------------------------------------------------------------
// District Metrics
// ---------------------------------------------------------------------------

export async function getDisciplineMetrics(tenantId: string) {
  const schoolYear = getCurrentSchoolYear();
  const { start: syStart3, end: syEnd3 } = schoolYearDateRange(schoolYear);

  const [totalCases, openCases, changeOfPlacementCases, pendingMdr] =
    await Promise.all([
      db.disciplineCase.count({
        where: {
          tenantId,
          removalStartDate: { gte: syStart3, lte: syEnd3 },
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

  return { totalCases, openCases, changeOfPlacementCases, pendingMdr };
}
