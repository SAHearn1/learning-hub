import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { createEvaluationPlan } from '@/lib/evaluation/evaluation.service';

const DOMAINS = [
  'ACADEMIC_ACHIEVEMENT', 'COGNITIVE', 'COMMUNICATION', 'SOCIAL_EMOTIONAL',
  'ADAPTIVE_BEHAVIOR', 'MOTOR', 'HEALTH', 'VISION', 'HEARING',
  'ASSISTIVE_TECHNOLOGY', 'TRANSITION', 'FUNCTIONAL_BEHAVIOR', 'VOCATIONAL', 'OTHER',
] as const;

const createSchema = z.object({
  assessmentDomains: z.array(z.enum(DOMAINS)).min(1),
  planContent: z.string().min(1),
});

export const GET = withApiHandler(async (_req, ctx) => {
  await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'PARENT',
  ]);

  const plan = await db.evaluationPlan.findUnique({
    where: { caseId: ctx.params.caseId },
  });

  return NextResponse.json({ data: plan });
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const plan = await createEvaluationPlan({
    caseId: ctx.params.caseId,
    assessmentDomains: body.assessmentDomains as any,
    planContent: body.planContent,
    createdBy: user.id,
  });

  return NextResponse.json({ data: plan }, { status: 201 });
});
