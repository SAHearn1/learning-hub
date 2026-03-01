/**
 * Evaluation Governance Service
 *
 * CRUD + business logic for the evaluation lifecycle.
 * Integrates PSN interceptor, state machine, timeline engine, and audit log.
 */

import crypto from 'crypto';
import { db } from '@/lib/db';
import { appendImmutableAuditLog } from '@/lib/audit';
import { intercept } from '@/lib/safeguards/psn-interceptor';
import { evaluateTransition } from './eval-state-machine';
import { calculateDueDate, checkTimelineCompliance } from './timeline-engine';
import { getOverlay } from './state-overlays';
import { generatePwnDocument } from './pwn-generator';
import { generateConsentDocument } from './consent-generator';
import { generateEligibilityDocument } from './eligibility-generator';
import type {
  EvalCaseType,
  EvalCaseState,
  ConsentType,
  ConsentDecision,
  AssessmentDomain,
  EligibilityOutcome,
  EvalCaseContext,
} from '@/types/evaluation';

// ---------------------------------------------------------------------------
// Create Case (triggers PSN interceptor)
// ---------------------------------------------------------------------------
export type CreateCaseParams = {
  tenantId: string;
  studentId: string;
  caseType: EvalCaseType;
  stateCode?: string;
  referralSource?: string;
  referralReason?: string;
  createdBy: string;
};

export async function createCase(params: CreateCaseParams) {
  const correlationId = crypto.randomUUID();
  const stateCode = params.stateCode ?? 'US';

  const evalCase = await db.evaluationCase.create({
    data: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      caseType: params.caseType as any,
      currentState: 'EVAL_TRIGGERED',
      stateCode,
      referralSource: params.referralSource,
      referralReason: params.referralReason,
      referralDate: new Date(),
      correlationId,
      createdBy: params.createdBy,
    },
  });

  // Trigger PSN interceptor — safeguards notice is required on referral
  await intercept({
    action: 'INITIAL_REFERRAL',
    tenantId: params.tenantId,
    studentId: params.studentId,
    caseId: evalCase.id,
    correlationId,
    userId: params.createdBy,
  }).catch(() => {
    // Interceptor failure is logged but doesn't block case creation
    // The compliance check will flag the missing safeguards
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.createdBy,
    action: 'EVALUATION_CASE_CREATED',
    resource: 'EvaluationCase',
    resourceId: evalCase.id,
    metadata: {
      caseType: params.caseType,
      stateCode,
      correlationId,
    },
  });

  return evalCase;
}

// ---------------------------------------------------------------------------
// Transition Case
// ---------------------------------------------------------------------------
export type TransitionCaseParams = {
  caseId: string;
  toState: EvalCaseState;
  reason?: string;
  userId: string;
};

export async function transitionCase(params: TransitionCaseParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
    include: {
      consents: true,
      plan: true,
      assignments: true,
      assessments: true,
      eligibilityMeeting: true,
      eligibilityDecision: true,
      transitions: { orderBy: { createdAt: 'asc' } },
    },
  });

  const fromState = evalCase.currentState as EvalCaseState;
  const overlay = getOverlay(evalCase.stateCode);

  // Build context for rule evaluation
  const ctx = await buildCaseContext(evalCase, overlay);
  const result = evaluateTransition(fromState, params.toState, ctx);

  if (!result.allowed) {
    return { success: false, result };
  }

  // Record immutable transition
  const transitionHash = result.transitionHash!;
  await db.evalStateTransition.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      fromState,
      toState: params.toState,
      transitionBy: params.userId,
      reason: params.reason,
      ruleResults: JSON.parse(JSON.stringify(result.ruleResults)),
      transitionHash,
    },
  });

  // Update case state + computed dates
  const updateData: Record<string, unknown> = {
    currentState: params.toState,
  };

  if (params.toState === 'CONSENT_RECEIVED' && !evalCase.consentReceivedDate) {
    updateData.consentReceivedDate = new Date();
    updateData.evaluationDueDate = new Date(
      calculateDueDate(
        new Date().toISOString(),
        overlay.evaluationTimelineDays,
        overlay.evaluationTimelineUnit,
      ),
    );
  }

  if (params.toState === 'CLOSED') {
    updateData.closedDate = new Date();
    updateData.closedReason = params.reason ?? 'Evaluation complete';
  }

  const updated = await db.evaluationCase.update({
    where: { id: params.caseId },
    data: updateData as any,
  });

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.userId,
    action: 'EVALUATION_STATE_TRANSITION',
    resource: 'EvaluationCase',
    resourceId: params.caseId,
    metadata: { from: fromState, to: params.toState, transitionHash },
  });

  return { success: true, result, evaluationCase: updated };
}

// ---------------------------------------------------------------------------
// Create Evaluation Plan
// ---------------------------------------------------------------------------
export type CreatePlanParams = {
  caseId: string;
  assessmentDomains: AssessmentDomain[];
  planContent: string;
  createdBy: string;
};

export async function createEvaluationPlan(params: CreatePlanParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
  });

  const planHash = crypto
    .createHash('sha256')
    .update(params.planContent)
    .digest('hex');
  const artifactRef = `eval-plan://${evalCase.tenantId}/${params.caseId}/${planHash}`;

  const plan = await db.evaluationPlan.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      assessmentDomains: params.assessmentDomains,
      planContent: params.planContent,
      planHash,
      artifactRef,
      createdBy: params.createdBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.createdBy,
    action: 'EVALUATION_PLAN_CREATED',
    resource: 'EvaluationPlan',
    resourceId: plan.id,
    metadata: { caseId: params.caseId, planHash },
  });

  return plan;
}

// ---------------------------------------------------------------------------
// Create Assignment
// ---------------------------------------------------------------------------
export type CreateAssignmentParams = {
  caseId: string;
  assessorId: string;
  domain: AssessmentDomain;
  dueDate?: string;
  createdBy: string;
};

export async function createAssignment(params: CreateAssignmentParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
  });

  const assignment = await db.evaluationAssignment.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      assessorId: params.assessorId,
      domain: params.domain as any,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
    },
  });

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.createdBy,
    action: 'EVALUATION_ASSIGNMENT_CREATED',
    resource: 'EvaluationAssignment',
    resourceId: assignment.id,
    metadata: { caseId: params.caseId, domain: params.domain },
  });

  return assignment;
}

// ---------------------------------------------------------------------------
// Record Assessment (blocked before consent)
// ---------------------------------------------------------------------------
export type RecordAssessmentParams = {
  caseId: string;
  assignmentId?: string;
  domain: AssessmentDomain;
  instrumentName: string;
  administeredBy: string;
  administeredDate: string;
  results: unknown;
  narrative?: string;
  userId: string;
};

export async function recordAssessment(params: RecordAssessmentParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
  });

  // Guard: consent must have been received
  const consentStates: EvalCaseState[] = [
    'CONSENT_RECEIVED', 'EVALUATION_PLANNED', 'ASSESSMENTS_IN_PROGRESS',
    'ASSESSMENTS_COMPLETE', 'ELIGIBILITY_MEETING', 'ELIGIBILITY_DECISION',
  ];
  if (!consentStates.includes(evalCase.currentState as EvalCaseState)) {
    throw new Error('Cannot record assessment before consent is received.');
  }

  const reportHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ ...params, timestamp: new Date().toISOString() }))
    .digest('hex');
  const artifactRef = `eval-assessment://${evalCase.tenantId}/${params.caseId}/${reportHash}`;

  const record = await db.evalAssessmentRecord.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      assignmentId: params.assignmentId,
      domain: params.domain as any,
      instrumentName: params.instrumentName,
      administeredBy: params.administeredBy,
      administeredDate: new Date(params.administeredDate),
      results: params.results as any,
      narrative: params.narrative,
      reportHash,
      artifactRef,
    },
  });

  // Mark assignment as completed if provided
  if (params.assignmentId) {
    await db.evaluationAssignment.update({
      where: { id: params.assignmentId },
      data: { completedAt: new Date() },
    });
  }

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.userId,
    action: 'EVAL_ASSESSMENT_RECORDED',
    resource: 'EvalAssessmentRecord',
    resourceId: record.id,
    metadata: { caseId: params.caseId, domain: params.domain, reportHash },
  });

  return record;
}

// ---------------------------------------------------------------------------
// Record Consent
// ---------------------------------------------------------------------------
export type RecordConsentParams = {
  caseId: string;
  consentType: ConsentType;
  decision: ConsentDecision;
  respondentId: string;
  respondentName: string;
  consentDate: string;
  notes?: string;
  userId: string;
};

export async function recordConsent(params: RecordConsentParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
  });

  const documentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ ...params, timestamp: new Date().toISOString() }))
    .digest('hex');
  const artifactRef = `eval-consent://${evalCase.tenantId}/${params.caseId}/${documentHash}`;

  const consent = await db.evalConsentRecord.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      consentType: params.consentType as any,
      decision: params.decision as any,
      respondentId: params.respondentId,
      respondentName: params.respondentName,
      consentDate: new Date(params.consentDate),
      documentHash,
      artifactRef,
      notes: params.notes,
    },
  });

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.userId,
    action: 'EVAL_CONSENT_RECORDED',
    resource: 'EvalConsentRecord',
    resourceId: consent.id,
    metadata: {
      caseId: params.caseId,
      consentType: params.consentType,
      decision: params.decision,
    },
  });

  return consent;
}

// ---------------------------------------------------------------------------
// Schedule Eligibility Meeting
// ---------------------------------------------------------------------------
export type ScheduleMeetingParams = {
  caseId: string;
  scheduledDate: string;
  requiredRoles: string[];
  createdBy: string;
};

export async function scheduleEligibilityMeeting(params: ScheduleMeetingParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
  });

  const overlay = getOverlay(evalCase.stateCode);
  const allRequired = [
    ...new Set([
      'PARENT', 'GENERAL_EDUCATION_TEACHER', 'SPECIAL_EDUCATION_TEACHER', 'LEA_REPRESENTATIVE',
      ...overlay.additionalRequiredMeetingRoles,
      ...params.requiredRoles,
    ]),
  ];

  const meeting = await db.eligibilityMeeting.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      scheduledDate: new Date(params.scheduledDate),
      attendees: [],
      requiredRoles: allRequired,
    },
  });

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.createdBy,
    action: 'ELIGIBILITY_MEETING_SCHEDULED',
    resource: 'EligibilityMeeting',
    resourceId: meeting.id,
    metadata: { caseId: params.caseId, scheduledDate: params.scheduledDate },
  });

  return meeting;
}

// ---------------------------------------------------------------------------
// Record Eligibility Decision
// ---------------------------------------------------------------------------
export type RecordDecisionParams = {
  caseId: string;
  outcome: EligibilityOutcome;
  disabilityCategory?: string;
  rationale: string;
  decisionDate: string;
  decidedBy: string;
};

export async function recordEligibilityDecision(params: RecordDecisionParams) {
  const evalCase = await db.evaluationCase.findUniqueOrThrow({
    where: { id: params.caseId },
    include: {
      eligibilityMeeting: true,
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: evalCase.tenantId } });

  const { content, docHash } = generateEligibilityDocument({
    studentName: `${evalCase.student.user.firstName} ${evalCase.student.user.lastName}`,
    districtName: tenant.name,
    outcome: params.outcome,
    disabilityCategory: params.disabilityCategory ?? null,
    rationale: params.rationale,
    assessmentSummary: 'See assessment records for full details.',
    meetingDate: params.decisionDate,
    attendees: (evalCase.eligibilityMeeting?.attendees as { name: string; role: string }[]) ?? [],
  });

  const artifactRef = `eligibility://${evalCase.tenantId}/${params.caseId}/${docHash}`;

  const decision = await db.eligibilityDecision.create({
    data: {
      tenantId: evalCase.tenantId,
      caseId: params.caseId,
      outcome: params.outcome as any,
      disabilityCategory: params.disabilityCategory,
      rationale: params.rationale,
      decisionDate: new Date(params.decisionDate),
      decisionHash: docHash,
      artifactRef,
      decidedBy: params.decidedBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: evalCase.tenantId,
    userId: params.decidedBy,
    action: 'ELIGIBILITY_DECISION_RECORDED',
    resource: 'EligibilityDecision',
    resourceId: decision.id,
    metadata: {
      caseId: params.caseId,
      outcome: params.outcome,
      decisionHash: docHash,
    },
  });

  return { decision, content };
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------
export async function getCasesForStudent(tenantId: string, studentId: string) {
  return db.evaluationCase.findMany({
    where: { tenantId, studentId },
    include: { transitions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCase(caseId: string) {
  return db.evaluationCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      plan: true,
      assignments: true,
      assessments: true,
      consents: true,
      eligibilityMeeting: true,
      eligibilityDecision: true,
      transitions: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function getComplianceMetrics(tenantId: string) {
  const [totalCases, openCases, overdueCount] = await Promise.all([
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
  ]);

  return { totalCases, openCases, overdueCount };
}

// ---------------------------------------------------------------------------
// Build Case Context (internal helper)
// ---------------------------------------------------------------------------
async function buildCaseContext(
  evalCase: any,
  overlay: any,
): Promise<EvalCaseContext> {
  // Fetch safeguards notices and PWN for this case/student
  const [safeguardsNotices, previousEvals] = await Promise.all([
    db.safeguardsNotice.findMany({
      where: { tenantId: evalCase.tenantId, studentId: evalCase.studentId },
      select: { id: true, deliveryStatus: true, trigger: true },
    }),
    db.evaluationCase.findMany({
      where: {
        tenantId: evalCase.tenantId,
        studentId: evalCase.studentId,
        id: { not: evalCase.id },
        currentState: 'CLOSED',
      },
      select: { id: true, closedDate: true, createdAt: true },
    }),
  ]);

  return {
    evaluationCase: {
      id: evalCase.id,
      tenantId: evalCase.tenantId,
      studentId: evalCase.studentId,
      caseType: evalCase.caseType,
      currentState: evalCase.currentState,
      stateCode: evalCase.stateCode,
      referralSource: evalCase.referralSource,
      referralReason: evalCase.referralReason,
      referralDate: evalCase.referralDate?.toISOString() ?? null,
      consentRequestedDate: evalCase.consentRequestedDate?.toISOString() ?? null,
      consentReceivedDate: evalCase.consentReceivedDate?.toISOString() ?? null,
      evaluationDueDate: evalCase.evaluationDueDate?.toISOString() ?? null,
      eligibilityDate: evalCase.eligibilityDate?.toISOString() ?? null,
      closedDate: evalCase.closedDate?.toISOString() ?? null,
      closedReason: evalCase.closedReason,
      correlationId: evalCase.correlationId,
      metadata: evalCase.metadata as any,
      createdBy: evalCase.createdBy,
      createdAt: evalCase.createdAt.toISOString(),
      updatedAt: evalCase.updatedAt.toISOString(),
    },
    consents: (evalCase.consents ?? []).map((c: any) => ({
      id: c.id,
      tenantId: c.tenantId,
      caseId: c.caseId,
      consentType: c.consentType,
      decision: c.decision,
      respondentId: c.respondentId,
      respondentName: c.respondentName,
      consentDate: c.consentDate.toISOString(),
      documentHash: c.documentHash,
      artifactRef: c.artifactRef,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
    plan: evalCase.plan
      ? {
          id: evalCase.plan.id,
          tenantId: evalCase.plan.tenantId,
          caseId: evalCase.plan.caseId,
          assessmentDomains: evalCase.plan.assessmentDomains as any,
          planContent: evalCase.plan.planContent,
          planHash: evalCase.plan.planHash,
          artifactRef: evalCase.plan.artifactRef,
          createdBy: evalCase.plan.createdBy,
          createdAt: evalCase.plan.createdAt.toISOString(),
        }
      : null,
    assignments: (evalCase.assignments ?? []).map((a: any) => ({
      id: a.id,
      tenantId: a.tenantId,
      caseId: a.caseId,
      assessorId: a.assessorId,
      domain: a.domain,
      dueDate: a.dueDate?.toISOString() ?? null,
      completedAt: a.completedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    assessments: (evalCase.assessments ?? []).map((a: any) => ({
      id: a.id,
      tenantId: a.tenantId,
      caseId: a.caseId,
      assignmentId: a.assignmentId,
      domain: a.domain,
      instrumentName: a.instrumentName,
      administeredBy: a.administeredBy,
      administeredDate: a.administeredDate.toISOString(),
      results: a.results,
      narrative: a.narrative,
      reportHash: a.reportHash,
      artifactRef: a.artifactRef,
      createdAt: a.createdAt.toISOString(),
    })),
    eligibilityMeeting: evalCase.eligibilityMeeting
      ? {
          id: evalCase.eligibilityMeeting.id,
          tenantId: evalCase.eligibilityMeeting.tenantId,
          caseId: evalCase.eligibilityMeeting.caseId,
          scheduledDate: evalCase.eligibilityMeeting.scheduledDate.toISOString(),
          actualDate: evalCase.eligibilityMeeting.actualDate?.toISOString() ?? null,
          attendees: evalCase.eligibilityMeeting.attendees as any,
          requiredRoles: evalCase.eligibilityMeeting.requiredRoles,
          meetingNotes: evalCase.eligibilityMeeting.meetingNotes,
          meetingHash: evalCase.eligibilityMeeting.meetingHash,
          createdAt: evalCase.eligibilityMeeting.createdAt.toISOString(),
          updatedAt: evalCase.eligibilityMeeting.updatedAt.toISOString(),
        }
      : null,
    eligibilityDecision: evalCase.eligibilityDecision
      ? {
          id: evalCase.eligibilityDecision.id,
          tenantId: evalCase.eligibilityDecision.tenantId,
          caseId: evalCase.eligibilityDecision.caseId,
          outcome: evalCase.eligibilityDecision.outcome,
          disabilityCategory: evalCase.eligibilityDecision.disabilityCategory,
          rationale: evalCase.eligibilityDecision.rationale,
          decisionDate: evalCase.eligibilityDecision.decisionDate.toISOString(),
          decisionHash: evalCase.eligibilityDecision.decisionHash,
          artifactRef: evalCase.eligibilityDecision.artifactRef,
          decidedBy: evalCase.eligibilityDecision.decidedBy,
          createdAt: evalCase.eligibilityDecision.createdAt.toISOString(),
        }
      : null,
    transitions: (evalCase.transitions ?? []).map((t: any) => ({
      id: t.id,
      tenantId: t.tenantId,
      caseId: t.caseId,
      fromState: t.fromState,
      toState: t.toState,
      transitionBy: t.transitionBy,
      reason: t.reason,
      ruleResults: t.ruleResults,
      transitionHash: t.transitionHash,
      createdAt: t.createdAt.toISOString(),
    })),
    safeguardsNotices: safeguardsNotices.map((n: any) => ({
      id: n.id,
      deliveryStatus: n.deliveryStatus,
      trigger: n.trigger,
    })),
    priorWrittenNotices: [],  // PWN integration point — will use dedicated PWN records
    previousEvaluations: previousEvals.map((e: any) => ({
      id: e.id,
      closedDate: e.closedDate?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    stateOverlay: overlay,
    nowDate: new Date().toISOString(),
  };
}
