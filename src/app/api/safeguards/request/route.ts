import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  upsertProceduralEvent,
  generateNotice,
  markNoticeDelivered,
} from '@/lib/safeguards/procedural-safeguards.service';
import { getCurrentSchoolYear } from '@/lib/safeguards/school-year';
import { NotFoundError } from '@/lib/api-errors';

const bodySchema = z.object({
  studentId: z.string().min(1),
});

/**
 * Parent-initiated safeguards request.
 * Creates the procedural event and immediately generates + delivers the notice.
 */
export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  const body = bodySchema.parse(await req.json());
  const correlationId = `parent-request-${user.id}-${body.studentId}-${Date.now()}`;

  const event = await upsertProceduralEvent({
    tenantId: user.tenantId,
    studentId: body.studentId,
    eventType: 'PARENT_SAFEGUARDS_REQUEST',
    trigger: 'PARENT_REQUEST',
    correlationId,
    createdBy: user.id,
  });

  // Look up student name
  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!student) throw new NotFoundError('Student not found');

  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new NotFoundError('Tenant not found');

  const { notice } = await generateNotice({
    tenantId: user.tenantId,
    studentId: body.studentId,
    studentName: `${student.user.firstName} ${student.user.lastName}`,
    districtName: tenant.name,
    proceduralEventId: event.id,
    trigger: 'PARENT_REQUEST',
    deliveryMethod: 'PORTAL',
    createdBy: user.id,
  });

  // Auto-deliver for portal requests
  const delivered = await markNoticeDelivered(notice.id, user.id);

  return NextResponse.json({ data: { event, notice: delivered } }, { status: 201 });
});
