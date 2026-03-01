import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { evaluateProceduralSafeguards } from '@/lib/safeguards/psn-evaluator';
import type { ProceduralSafeguardsContext } from '@/types/safeguards';

const SAFEGUARDS_TRIGGERS = [
  'ANNUAL_NOTICE',
  'INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST',
  'FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR',
  'FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR',
  'DISCIPLINARY_CHANGE_OF_PLACEMENT',
  'PARENT_REQUEST',
] as const;

const bodySchema = z.object({
  trigger: z.enum(SAFEGUARDS_TRIGGERS),
  studentId: z.string().min(1),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  caseId: z.string().nullish(),
  existingNotices: z.array(z.any()).default([]),
  existingEvents: z.array(z.any()).default([]),
  proceduralEventId: z.string().optional(),
});

export const POST = withApiHandler(async (req) => {
  await requireRole(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const body = bodySchema.parse(await req.json());

  const result = evaluateProceduralSafeguards(body as ProceduralSafeguardsContext);

  return NextResponse.json({ data: result });
});
