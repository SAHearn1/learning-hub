import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { recordEligibilityDecision } from '@/lib/evaluation/evaluation.service';

const OUTCOMES = ['ELIGIBLE', 'NOT_ELIGIBLE', 'DISMISSED'] as const;

const createSchema = z.object({
  outcome: z.enum(OUTCOMES),
  disabilityCategory: z.string().optional(),
  rationale: z.string().min(1),
  decisionDate: z.string().min(1),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const { decision, content } = await recordEligibilityDecision({
    caseId: ctx.params.caseId,
    outcome: body.outcome,
    disabilityCategory: body.disabilityCategory,
    rationale: body.rationale,
    decisionDate: body.decisionDate,
    decidedBy: user.id,
  });

  return NextResponse.json({ data: { decision, content } }, { status: 201 });
});
