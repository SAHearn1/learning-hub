import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/api-errors';
import {
  generateProgressReport,
  getReportsForGoal,
} from '@/lib/progress-monitoring/progress-monitoring.service';

const createSchema = z.object({
  reportingPeriodStart: z.string().min(1),
  reportingPeriodEnd: z.string().min(1),
});

export const GET = withApiHandler(async (_req, ctx) => {
  await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'PARENT',
  ]);

  const reports = await getReportsForGoal(ctx.params.goalId);
  return NextResponse.json({ data: reports });
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const goal = await db.iepGoal.findUniqueOrThrow({
    where: { id: ctx.params.goalId },
  });

  const student = await db.student.findUnique({
    where: { id: goal.studentId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!student) throw new NotFoundError('Student not found');

  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new NotFoundError('Tenant not found');

  const { report, content } = await generateProgressReport({
    tenantId: user.tenantId,
    goalId: ctx.params.goalId,
    studentId: goal.studentId,
    studentName: `${student.user.firstName} ${student.user.lastName}`,
    districtName: tenant.name,
    reportingPeriodStart: body.reportingPeriodStart,
    reportingPeriodEnd: body.reportingPeriodEnd,
    generatedBy: user.id,
  });

  return NextResponse.json({ data: { report, content } }, { status: 201 });
});
