import { ConsentStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageMinorConsent, isConsentStatusTransitionAllowed } from '@/lib/compliance';
import { appendImmutableAuditLog } from '@/lib/audit';
import { assertTenantAccess } from '@/lib/rbac';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-errors';

const updateConsentSchema = z.object({
  studentUserId: z.string().min(1),
  consentStatus: z.enum(['PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN']),
  method: z.string().min(2).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const actor = await requireUser();
  const url = new URL(req.url);
  const studentUserId = url.searchParams.get('studentUserId') || actor.id;

  if (studentUserId !== actor.id && !canManageMinorConsent(actor.role)) {
    throw new ForbiddenError('Forbidden');
  }

  const student = await db.user.findUnique({
    where: { id: studentUserId },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      isMinor: true,
      consentStatus: true,
      updatedAt: true,
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  if (student.tenantId !== actor.tenantId) {
    throw new ForbiddenError('Forbidden');
  }

  return NextResponse.json({ consent: student });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const actor = await requireUser();
  if (!canManageMinorConsent(actor.role)) {
    throw new ForbiddenError('Only parent/admin roles can update consent status');
  }

  const payload = updateConsentSchema.parse(await req.json());

  const student = await db.user.findUnique({
    where: { id: payload.studentUserId },
    select: {
      id: true,
      tenantId: true,
      isMinor: true,
      consentStatus: true,
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  try {
    assertTenantAccess(actor.role, actor.tenantId, student.tenantId);
  } catch {
    throw new ForbiddenError('Forbidden');
  }

  if (!student.isMinor) {
    throw new BadRequestError('Consent workflow applies only to minor accounts');
  }

  const currentStatus = student.consentStatus as ConsentStatus | null;
  if (!isConsentStatusTransitionAllowed(currentStatus, payload.consentStatus)) {
    throw new BadRequestError(
      `Invalid consent status transition from ${currentStatus ?? 'UNSET'} to ${payload.consentStatus}`
    );
  }

  const updated = await db.user.update({
    where: { id: student.id },
    data: {
      consentStatus: payload.consentStatus,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      consentStatus: true,
      updatedAt: true,
    },
  });

  await appendImmutableAuditLog({
    tenantId: student.tenantId,
    userId: actor.id,
    action: 'CONSENT_STATUS_UPDATED',
    resource: 'User',
    resourceId: student.id,
    metadata: {
      previousStatus: currentStatus,
      nextStatus: payload.consentStatus,
      method: payload.method,
      notes: payload.notes,
    },
  });

  return NextResponse.json({ success: true, consent: updated });
});
