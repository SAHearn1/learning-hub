import { ConsentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageMinorConsent, isConsentStatusTransitionAllowed } from '@/lib/compliance';

const updateConsentSchema = z.object({
  studentUserId: z.string().min(1),
  consentStatus: z.enum(['PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN']),
  method: z.string().min(2).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const GET = withApiHandler(async (req) => {
  const actor = await requireUser();
  const url = new URL(req.url);
  const studentUserId = url.searchParams.get('studentUserId') || actor.id;

  if (studentUserId !== actor.id && !canManageMinorConsent(actor.role)) {
    throw new ForbiddenError();
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
    throw new ForbiddenError();
  }

  return NextResponse.json({ consent: student });
}, { rateLimit: { windowMs: 60_000, max: 60 } });

export const POST = withApiHandler(async (req) => {
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

  if (student.tenantId !== actor.tenantId) {
    throw new ForbiddenError();
  }

  if (!student.isMinor) {
    throw new ValidationError('Consent workflow applies only to minor accounts');
  }

  const currentStatus = student.consentStatus as ConsentStatus | null;
  if (!isConsentStatusTransitionAllowed(currentStatus, payload.consentStatus)) {
    throw new ValidationError(
      `Invalid consent status transition from ${currentStatus ?? 'UNSET'} to ${payload.consentStatus}`,
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

  await db.auditLog.create({
    data: {
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
    },
  });

  return NextResponse.json({ success: true, consent: updated });
}, { rateLimit: { windowMs: 60_000, max: 30 } });
