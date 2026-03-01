import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { createGoal, getGoalsForStudent } from '@/lib/progress-monitoring/progress-monitoring.service';

const MEASUREMENT_METHODS = [
  'CURRICULUM_BASED', 'OBSERVATION', 'RUBRIC',
  'STANDARDIZED_ASSESSMENT', 'WORK_SAMPLE', 'DATA_COLLECTION',
] as const;

const REPORTING_FREQUENCIES = [
  'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'TRIMESTER', 'SEMESTER',
] as const;

const createSchema = z.object({
  studentId: z.string().min(1),
  goalCode: z.string().min(1),
  description: z.string().min(1),
  baselineValue: z.number(),
  baselineDate: z.string().min(1),
  targetValue: z.number(),
  targetDate: z.string().min(1),
  measurementMethod: z.enum(MEASUREMENT_METHODS).optional(),
  measurementUnit: z.string().optional(),
  reportingFrequency: z.enum(REPORTING_FREQUENCIES).optional(),
  monitoringIntervalDays: z.number().int().positive().optional(),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId query param required' }, { status: 400 });
  }

  const goals = await getGoalsForStudent(user.tenantId, studentId);
  return NextResponse.json({ data: goals });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const goal = await createGoal({
    tenantId: user.tenantId,
    studentId: body.studentId,
    goalCode: body.goalCode,
    description: body.description,
    baselineValue: body.baselineValue,
    baselineDate: body.baselineDate,
    targetValue: body.targetValue,
    targetDate: body.targetDate,
    measurementMethod: body.measurementMethod,
    measurementUnit: body.measurementUnit,
    reportingFrequency: body.reportingFrequency,
    monitoringIntervalDays: body.monitoringIntervalDays,
    createdBy: user.id,
  });

  return NextResponse.json({ data: goal }, { status: 201 });
});
