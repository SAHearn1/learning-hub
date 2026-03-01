import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { closeDisciplineCase } from '@/lib/discipline/discipline.service';

const closeSchema = z.object({
  reason: z.string().min(1),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole([
    'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = closeSchema.parse(await req.json());

  const updated = await closeDisciplineCase(
    ctx.params.caseId,
    body.reason,
    user.id,
  );

  return NextResponse.json({ data: updated });
});
