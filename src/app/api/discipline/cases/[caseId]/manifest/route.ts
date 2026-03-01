import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { recordManifestDetermination } from '@/lib/discipline/discipline.service';

const mdrSchema = z.object({
  meetingDate: z.string().min(1),
  attendees: z.array(
    z.object({ name: z.string(), role: z.string() }),
  ),
  outcome: z.enum(['IS_MANIFESTATION', 'NOT_MANIFESTATION']),
  rationale: z.string().min(1),
  conductRelated: z.boolean(),
  disabilityRelated: z.boolean(),
  iepImplemented: z.boolean(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = mdrSchema.parse(await req.json());

  const mdr = await recordManifestDetermination({
    tenantId: user.tenantId,
    caseId: ctx.params.caseId,
    ...body,
    decidedBy: user.id,
  });

  return NextResponse.json({ data: mdr }, { status: 201 });
});
