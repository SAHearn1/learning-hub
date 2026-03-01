import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { createAssignment } from '@/lib/evaluation/evaluation.service';

const DOMAINS = [
  'ACADEMIC_ACHIEVEMENT', 'COGNITIVE', 'COMMUNICATION', 'SOCIAL_EMOTIONAL',
  'ADAPTIVE_BEHAVIOR', 'MOTOR', 'HEALTH', 'VISION', 'HEARING',
  'ASSISTIVE_TECHNOLOGY', 'TRANSITION', 'FUNCTIONAL_BEHAVIOR', 'VOCATIONAL', 'OTHER',
] as const;

const createSchema = z.object({
  assessorId: z.string().min(1),
  domain: z.enum(DOMAINS),
  dueDate: z.string().optional(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const assignment = await createAssignment({
    caseId: ctx.params.caseId,
    assessorId: body.assessorId,
    domain: body.domain,
    dueDate: body.dueDate,
    createdBy: user.id,
  });

  return NextResponse.json({ data: assignment }, { status: 201 });
});
