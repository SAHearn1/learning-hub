import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createManualIntervention } from '@/lib/super-admin';
import { withApiHandler } from '@/lib/api-handler';

const requestSchema = z.object({
  summary: z.string().min(5).max(140),
  details: z.string().max(5000).optional(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const actor = await requireRole(['PLATFORM_ADMIN']);
  const body = requestSchema.parse(await req.json());

  const intervention = await createManualIntervention({
    tenantId: ctx.params.tenantId,
    actorUserId: actor.id,
    summary: body.summary,
    details: body.details,
  });

  return NextResponse.json({ interventionId: intervention.id, createdAt: intervention.timestamp });
});
