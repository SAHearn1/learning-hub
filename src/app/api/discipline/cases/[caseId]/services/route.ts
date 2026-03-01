import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { documentServicesContinuation } from '@/lib/discipline/discipline.service';

const servicesSchema = z.object({
  servicesDescription: z.string().min(1),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = servicesSchema.parse(await req.json());

  const updated = await documentServicesContinuation(
    ctx.params.caseId,
    body.servicesDescription,
    user.id,
  );

  return NextResponse.json({ data: updated });
});
