import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { recordAssessment } from '@/lib/evaluation/evaluation.service';

const DOMAINS = [
  'ACADEMIC_ACHIEVEMENT', 'COGNITIVE', 'COMMUNICATION', 'SOCIAL_EMOTIONAL',
  'ADAPTIVE_BEHAVIOR', 'MOTOR', 'HEALTH', 'VISION', 'HEARING',
  'ASSISTIVE_TECHNOLOGY', 'TRANSITION', 'FUNCTIONAL_BEHAVIOR', 'VOCATIONAL', 'OTHER',
] as const;

const createSchema = z.object({
  assignmentId: z.string().optional(),
  domain: z.enum(DOMAINS),
  instrumentName: z.string().min(1),
  administeredDate: z.string().min(1),
  results: z.any(),
  narrative: z.string().optional(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const record = await recordAssessment({
    caseId: ctx.params.caseId,
    assignmentId: body.assignmentId,
    domain: body.domain,
    instrumentName: body.instrumentName,
    administeredBy: user.id,
    administeredDate: body.administeredDate,
    results: body.results,
    narrative: body.narrative,
    userId: user.id,
  });

  return NextResponse.json({ data: record }, { status: 201 });
});
