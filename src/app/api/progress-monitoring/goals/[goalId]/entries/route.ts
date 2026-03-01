import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { addProgressEntry, getEntriesForGoal } from '@/lib/progress-monitoring/progress-monitoring.service';
import { db } from '@/lib/db';

const MEASUREMENT_METHODS = [
  'CURRICULUM_BASED', 'OBSERVATION', 'RUBRIC',
  'STANDARDIZED_ASSESSMENT', 'WORK_SAMPLE', 'DATA_COLLECTION',
] as const;

const createSchema = z.object({
  recordedValue: z.number(),
  measurementMethod: z.enum(MEASUREMENT_METHODS),
  observationDate: z.string().min(1),
  notes: z.string().optional(),
});

export const GET = withApiHandler(async (_req, ctx) => {
  await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'PARENT',
  ]);

  const entries = await getEntriesForGoal(ctx.params.goalId);
  return NextResponse.json({ data: entries });
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const goal = await db.iepGoal.findUniqueOrThrow({
    where: { id: ctx.params.goalId },
  });

  const entry = await addProgressEntry({
    tenantId: user.tenantId,
    goalId: ctx.params.goalId,
    studentId: goal.studentId,
    recordedValue: body.recordedValue,
    measurementMethod: body.measurementMethod,
    observationDate: body.observationDate,
    notes: body.notes,
    recordedBy: user.id,
  });

  return NextResponse.json({ data: entry }, { status: 201 });
});
