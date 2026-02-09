import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { setTenantSuspension } from '@/lib/super-admin';

const requestSchema = z.object({
  suspend: z.boolean(),
  reason: z.string().min(3).max(280).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const actor = await requireRole(['PLATFORM_ADMIN']);
    const body = requestSchema.parse(await request.json());
    const { tenantId } = await params;

    const tenant = await setTenantSuspension({
      tenantId,
      actorUserId: actor.id,
      suspend: body.suspend,
      reason: body.reason,
    });

    return NextResponse.json({
      tenantId: tenant.id,
      isSuspended: tenant.isSuspended,
      suspendedAt: tenant.suspendedAt,
      suspensionReason: tenant.suspensionReason,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
