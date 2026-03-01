import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { getCase } from '@/lib/evaluation/evaluation.service';

export const GET = withApiHandler(async (_req, ctx) => {
  await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'PARENT',
  ]);

  const evalCase = await getCase(ctx.params.caseId);
  return NextResponse.json({ data: evalCase });
});
