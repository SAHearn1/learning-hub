import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { setTenantSuspension } from '@/lib/super-admin';
import { withApiHandler } from '@/lib/api-handler';

const requestSchema = z.object({
  suspend: z.boolean(),
  reason: z.string().min(3).max(280).optional(),
});

export const PATCH = withApiHandler(async (req, ctx) => {
  const actor = await requireRole(['PLATFORM_ADMIN']);
  const body = requestSchema.parse(await req.json());

  const tenant = await setTenantSuspension({
    tenantId: ctx.params.tenantId,
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
});
