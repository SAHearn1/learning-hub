/**
 * Procedural Safeguards Service
 *
 * CRUD operations for ProceduralEvents and SafeguardsNotices.
 * Follows the same db import + audit pattern used across the codebase.
 */

import { db } from '@/lib/db';
import { appendImmutableAuditLog } from '@/lib/audit';
import { getCurrentSchoolYear } from './school-year';
import { generateSafeguardsNoticeDocument } from './notice-generator';
import type {
  DeliveryMethod,
  ProceduralEventType,
  SafeguardsTrigger,
} from '@/types/safeguards';

// ---------------------------------------------------------------------------
// Event types that have a "first of type" constraint per school year
// ---------------------------------------------------------------------------
const FIRST_OF_TYPE_EVENTS: ProceduralEventType[] = [
  'STATE_COMPLAINT_FILED',
  'DUE_PROCESS_COMPLAINT_FILED',
];

// ---------------------------------------------------------------------------
// Upsert Procedural Event
// ---------------------------------------------------------------------------
export type UpsertEventParams = {
  tenantId: string;
  studentId: string;
  caseId?: string | null;
  eventType: ProceduralEventType;
  trigger: SafeguardsTrigger;
  correlationId: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
};

export async function upsertProceduralEvent(params: UpsertEventParams) {
  const schoolYear = getCurrentSchoolYear();

  let isFirstOfType = false;

  if (FIRST_OF_TYPE_EVENTS.includes(params.eventType)) {
    const existing = await db.proceduralEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        studentId: params.studentId,
        schoolYear,
        eventType: params.eventType as any,
        isFirstOfType: true,
      },
    });
    isFirstOfType = !existing;
  }

  const event = await db.proceduralEvent.upsert({
    where: {
      tenantId_correlationId: {
        tenantId: params.tenantId,
        correlationId: params.correlationId,
      },
    },
    create: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      caseId: params.caseId ?? null,
      eventType: params.eventType as any,
      trigger: params.trigger as any,
      schoolYear,
      correlationId: params.correlationId,
      isFirstOfType,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      createdBy: params.createdBy,
    },
    update: {},
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.createdBy,
    action: 'PROCEDURAL_EVENT_CREATED',
    resource: 'ProceduralEvent',
    resourceId: event.id,
    metadata: {
      eventType: params.eventType,
      trigger: params.trigger,
      correlationId: params.correlationId,
      schoolYear,
    },
  });

  return event;
}

// ---------------------------------------------------------------------------
// Check if trigger is satisfied (notice DELIVERED or ACKNOWLEDGED)
// ---------------------------------------------------------------------------
export type TriggerSatisfiedParams = {
  tenantId: string;
  studentId: string;
  schoolYear: string;
  proceduralEventId?: string;
};

export async function isTriggerSatisfied(params: TriggerSatisfiedParams): Promise<boolean> {
  const where: Record<string, unknown> = {
    tenantId: params.tenantId,
    studentId: params.studentId,
    schoolYear: params.schoolYear,
    deliveryStatus: { in: ['DELIVERED', 'ACKNOWLEDGED'] },
  };

  if (params.proceduralEventId) {
    where.proceduralEventId = params.proceduralEventId;
  }

  const count = await db.safeguardsNotice.count({ where: where as any });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Generate and store a notice
// ---------------------------------------------------------------------------
export type GenerateNoticeParams = {
  tenantId: string;
  studentId: string;
  studentName: string;
  districtName: string;
  caseId?: string | null;
  proceduralEventId: string;
  trigger: SafeguardsTrigger;
  deliveryMethod?: DeliveryMethod;
  createdBy: string;
};

export async function generateNotice(params: GenerateNoticeParams) {
  const schoolYear = getCurrentSchoolYear();
  const issueDate = new Date().toISOString().split('T')[0];

  const { content, docHash } = generateSafeguardsNoticeDocument({
    trigger: params.trigger,
    studentName: params.studentName,
    districtName: params.districtName,
    schoolYear,
    issueDate,
  });

  // In production, content would be stored in a document store (S3, etc.).
  // For now, artifactRef is a content-addressable reference.
  const artifactRef = `psn://${params.tenantId}/${params.studentId}/${docHash}`;

  const notice = await db.safeguardsNotice.create({
    data: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      caseId: params.caseId ?? null,
      proceduralEventId: params.proceduralEventId,
      trigger: params.trigger as any,
      deliveryMethod: (params.deliveryMethod ?? 'PORTAL') as any,
      deliveryStatus: 'GENERATED',
      noticeDocHash: docHash,
      artifactRef,
      schoolYear,
    },
  });

  await appendImmutableAuditLog({
    tenantId: params.tenantId,
    userId: params.createdBy,
    action: 'SAFEGUARDS_NOTICE_GENERATED',
    resource: 'SafeguardsNotice',
    resourceId: notice.id,
    metadata: {
      trigger: params.trigger,
      docHash,
      schoolYear,
    },
  });

  return { notice, content };
}

// ---------------------------------------------------------------------------
// Mark notice as delivered
// ---------------------------------------------------------------------------
export async function markNoticeDelivered(noticeId: string, userId: string) {
  const notice = await db.safeguardsNotice.update({
    where: { id: noticeId },
    data: {
      deliveryStatus: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });

  await appendImmutableAuditLog({
    tenantId: notice.tenantId,
    userId,
    action: 'SAFEGUARDS_NOTICE_DELIVERED',
    resource: 'SafeguardsNotice',
    resourceId: notice.id,
  });

  return notice;
}

// ---------------------------------------------------------------------------
// Acknowledge notice (parent action)
// ---------------------------------------------------------------------------
export async function acknowledgeNotice(noticeId: string, acknowledgedBy: string) {
  const notice = await db.safeguardsNotice.update({
    where: { id: noticeId },
    data: {
      deliveryStatus: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedBy,
    },
  });

  await appendImmutableAuditLog({
    tenantId: notice.tenantId,
    userId: acknowledgedBy,
    action: 'SAFEGUARDS_NOTICE_ACKNOWLEDGED',
    resource: 'SafeguardsNotice',
    resourceId: notice.id,
  });

  return notice;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------
export async function getNoticesForStudent(tenantId: string, studentId: string) {
  return db.safeguardsNotice.findMany({
    where: { tenantId, studentId },
    include: { proceduralEvent: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getEventsForStudent(tenantId: string, studentId: string) {
  return db.proceduralEvent.findMany({
    where: { tenantId, studentId },
    orderBy: { createdAt: 'desc' },
  });
}
