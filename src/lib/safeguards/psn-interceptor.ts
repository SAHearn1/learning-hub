/**
 * PSN Workflow Interceptor
 *
 * Enforcement gate that maps workflow actions to PSN triggers,
 * upserts the corresponding event, checks whether the obligation
 * is satisfied, and runs the legal validation rules.
 */

import type {
  PsnWorkflowAction,
  SafeguardsTrigger,
  ProceduralEventType,
  ProceduralSafeguardsValidationResult,
} from '@/types/safeguards';
import { upsertProceduralEvent, isTriggerSatisfied } from './procedural-safeguards.service';
import { evaluateProceduralSafeguards } from './psn-evaluator';
import { getCurrentSchoolYear } from './school-year';
import { db } from '@/lib/db';

type ActionMapping = {
  trigger: SafeguardsTrigger;
  eventType: ProceduralEventType;
};

const ACTION_MAP: Record<PsnWorkflowAction, ActionMapping> = {
  INITIAL_REFERRAL: {
    trigger: 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
    eventType: 'REFERRAL_RECEIVED',
  },
  PARENT_REQUEST_EVALUATION: {
    trigger: 'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
    eventType: 'PARENT_EVAL_REQUEST',
  },
  DISCIPLINARY_PLACEMENT: {
    trigger: 'DISCIPLINARY_CHANGE_OF_PLACEMENT',
    eventType: 'DISCIPLINARY_PLACEMENT_CHANGE',
  },
  STATE_COMPLAINT_FILED: {
    trigger: 'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
    eventType: 'STATE_COMPLAINT_FILED',
  },
  DUE_PROCESS_COMPLAINT_FILED: {
    trigger: 'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR',
    eventType: 'DUE_PROCESS_COMPLAINT_FILED',
  },
  PARENT_REQUEST_SAFEGUARDS: {
    trigger: 'PARENT_REQUEST',
    eventType: 'PARENT_SAFEGUARDS_REQUEST',
  },
  ANNUAL_SAFEGUARDS_DUE: {
    trigger: 'ANNUAL_NOTICE',
    eventType: 'ANNUAL_NOTICE_DUE',
  },
};

export function mapActionToTrigger(action: PsnWorkflowAction): ActionMapping | null {
  return ACTION_MAP[action] ?? null;
}

export type InterceptParams = {
  action: PsnWorkflowAction;
  tenantId: string;
  studentId: string;
  caseId?: string | null;
  correlationId: string;
  userId: string;
};

export type InterceptResult = {
  allowed: boolean;
  validation: ProceduralSafeguardsValidationResult;
  eventId: string;
};

export async function intercept(params: InterceptParams): Promise<InterceptResult> {
  const mapping = mapActionToTrigger(params.action);
  if (!mapping) {
    throw new Error(`Unknown PSN workflow action: ${params.action}`);
  }

  const schoolYear = getCurrentSchoolYear();

  // 1. Upsert the procedural event
  const event = await upsertProceduralEvent({
    tenantId: params.tenantId,
    studentId: params.studentId,
    caseId: params.caseId,
    eventType: mapping.eventType,
    trigger: mapping.trigger,
    correlationId: params.correlationId,
    createdBy: params.userId,
  });

  // 2. Gather existing notices and events for validation context
  const [existingNotices, existingEvents] = await Promise.all([
    db.safeguardsNotice.findMany({
      where: { tenantId: params.tenantId, studentId: params.studentId, schoolYear },
    }),
    db.proceduralEvent.findMany({
      where: { tenantId: params.tenantId, studentId: params.studentId, schoolYear },
    }),
  ]);

  // 3. Map DB records to type-safe shapes for the evaluator
  const noticesForCtx = existingNotices.map((n) => ({
    id: n.id,
    tenantId: n.tenantId,
    studentId: n.studentId,
    caseId: n.caseId,
    proceduralEventId: n.proceduralEventId,
    trigger: n.trigger as unknown as import('@/types/safeguards').SafeguardsTrigger,
    deliveryMethod: n.deliveryMethod as unknown as import('@/types/safeguards').DeliveryMethod,
    deliveryStatus: n.deliveryStatus as unknown as import('@/types/safeguards').DeliveryStatus,
    deliveredAt: n.deliveredAt?.toISOString() ?? null,
    acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
    acknowledgedBy: n.acknowledgedBy,
    noticeDocHash: n.noticeDocHash,
    artifactRef: n.artifactRef,
    schoolYear: n.schoolYear,
    createdAt: n.createdAt.toISOString(),
  }));

  const eventsForCtx = existingEvents.map((e) => ({
    id: e.id,
    tenantId: e.tenantId,
    studentId: e.studentId,
    caseId: e.caseId,
    eventType: e.eventType as unknown as import('@/types/safeguards').ProceduralEventType,
    trigger: e.trigger as unknown as import('@/types/safeguards').SafeguardsTrigger,
    schoolYear: e.schoolYear,
    correlationId: e.correlationId,
    isFirstOfType: e.isFirstOfType,
    metadata: e.metadata as Record<string, unknown> | null,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
  }));

  // 4. Run legal validation
  const validation = evaluateProceduralSafeguards({
    trigger: mapping.trigger,
    studentId: params.studentId,
    schoolYear,
    caseId: params.caseId,
    existingNotices: noticesForCtx,
    existingEvents: eventsForCtx,
    proceduralEventId: event.id,
  });

  return {
    allowed: validation.passed,
    validation,
    eventId: event.id,
  };
}
