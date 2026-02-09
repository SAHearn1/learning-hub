import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createManualIntervention } from '@/lib/super-admin';

const requestSchema = z.object({
  summary: z.string().min(5).max(140),
  details: z.string().max(5000).optional(),
});

export async function POST(request: Request, { params }: { params: { tenantId: string } }) {
  try {
    const actor = await requireRole(['PLATFORM_ADMIN']);
    const body = requestSchema.parse(await request.json());

    const intervention = await createManualIntervention({
      tenantId: params.tenantId,
      actorUserId: actor.id,
      summary: body.summary,
      details: body.details,
    });

    return NextResponse.json({ interventionId: intervention.id, createdAt: intervention.timestamp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
