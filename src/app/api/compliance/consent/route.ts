import { ConsentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageMinorConsent, isConsentStatusTransitionAllowed } from '@/lib/compliance';

const updateConsentSchema = z.object({
  studentUserId: z.string().min(1),
  consentStatus: z.enum(['PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN']),
  method: z.string().min(2).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: Request) {
  const actor = await requireUser();
  const url = new URL(request.url);
  const studentUserId = url.searchParams.get('studentUserId') || actor.id;

  if (studentUserId !== actor.id && !canManageMinorConsent(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (student.tenantId !== actor.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ consent: student });
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    if (!canManageMinorConsent(actor.role)) {
      return NextResponse.json({ error: 'Only parent/admin roles can update consent status' }, { status: 403 });
    }

    const payload = updateConsentSchema.parse(await request.json());

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
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.tenantId !== actor.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!student.isMinor) {
      return NextResponse.json({ error: 'Consent workflow applies only to minor accounts' }, { status: 400 });
    }

    const currentStatus = student.consentStatus as ConsentStatus | null;
    if (!isConsentStatusTransitionAllowed(currentStatus, payload.consentStatus)) {
      return NextResponse.json(
        { error: `Invalid consent status transition from ${currentStatus ?? 'UNSET'} to ${payload.consentStatus}` },
        { status: 400 }
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to update consent status' }, { status: 500 });
  }
}
