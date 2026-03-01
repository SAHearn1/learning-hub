import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateNotice, markNoticeDelivered } from '@/lib/safeguards/procedural-safeguards.service';
import { NotFoundError } from '@/lib/api-errors';

const SAFEGUARDS_TRIGGERS = [
  'ANNUAL_NOTICE',
  'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
  'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
  'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR',
  'DISCIPLINARY_CHANGE_OF_PLACEMENT',
  'PARENT_REQUEST',
] as const;

const DELIVERY_METHODS = ['PORTAL', 'EMAIL', 'MAIL', 'HAND_DELIVERED'] as const;

const bodySchema = z.object({
  studentId: z.string().min(1),
  proceduralEventId: z.string().min(1),
  trigger: z.enum(SAFEGUARDS_TRIGGERS),
  deliveryMethod: z.enum(DELIVERY_METHODS).default('PORTAL'),
  markDelivered: z.boolean().default(false),
});

export const POST = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = bodySchema.parse(await req.json());

  // Look up student for name
  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!student) throw new NotFoundError('Student not found');

  // Look up tenant for district name
  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new NotFoundError('Tenant not found');

  const { notice, content } = await generateNotice({
    tenantId: user.tenantId,
    studentId: body.studentId,
    studentName: `${student.user.firstName} ${student.user.lastName}`,
    districtName: tenant.name,
    proceduralEventId: body.proceduralEventId,
    trigger: body.trigger,
    deliveryMethod: body.deliveryMethod,
    createdBy: user.id,
  });

  // Optionally mark as delivered immediately (e.g., portal delivery)
  if (body.markDelivered) {
    const delivered = await markNoticeDelivered(notice.id, user.id);
    return NextResponse.json({ data: { notice: delivered, content } }, { status: 201 });
  }

  return NextResponse.json({ data: { notice, content } }, { status: 201 });
});
