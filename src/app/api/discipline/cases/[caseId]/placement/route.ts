import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { setPlacement } from '@/lib/discipline/discipline.service';

const placementSchema = z.object({
  placement: z.enum([
    'RETURN_TO_PLACEMENT',
    'IAES',
    'ALTERNATIVE_SETTING',
    'HOME_INSTRUCTION',
  ]),
  iaesEndDate: z.string().nullable().optional(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = placementSchema.parse(await req.json());

  const updated = await setPlacement(
    ctx.params.caseId,
    body.placement,
    body.iaesEndDate ?? null,
    user.id,
  );

  return NextResponse.json({ data: updated });
});
