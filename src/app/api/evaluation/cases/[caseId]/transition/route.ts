import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { transitionCase } from '@/lib/evaluation/evaluation.service';

const STATES = [
  'EVAL_TRIGGERED', 'SAFEGUARDS_ISSUED', 'SAFEGUARDS_REQUIRED',
  'CONSENT_REQUESTED', 'CONSENT_RECEIVED', 'CONSENT_REFUSED',
  'EVALUATION_PLANNED', 'ASSESSMENTS_IN_PROGRESS', 'ASSESSMENTS_COMPLETE',
  'ELIGIBILITY_MEETING', 'ELIGIBILITY_DECISION', 'CLOSED',
] as const;

const bodySchema = z.object({
  toState: z.enum(STATES),
  reason: z.string().optional(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = bodySchema.parse(await req.json());

  const result = await transitionCase({
    caseId: ctx.params.caseId,
    toState: body.toState,
    reason: body.reason,
    userId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ data: result }, { status: 422 });
  }

  return NextResponse.json({ data: result });
});
