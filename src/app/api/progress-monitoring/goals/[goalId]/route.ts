import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { getGoal, updateGoalStatus } from '@/lib/progress-monitoring/progress-monitoring.service';

const GOAL_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'DISCONTINUED'] as const;

const patchSchema = z.object({
  status: z.enum(GOAL_STATUSES),
});

export const GET = withApiHandler(async (_req, ctx) => {
  await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'PARENT',
  ]);

  const goal = await getGoal(ctx.params.goalId);
  return NextResponse.json({ data: goal });
});

export const PATCH = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = patchSchema.parse(await req.json());
  const goal = await updateGoalStatus(ctx.params.goalId, body.status, user.id);
  return NextResponse.json({ data: goal });
});
