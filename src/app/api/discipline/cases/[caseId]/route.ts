import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { getCase } from '@/lib/discipline/discipline.service';

export const GET = withApiHandler(async (_req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const dCase = await getCase(ctx.params.caseId);

  if (!dCase || dCase.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  return NextResponse.json({ data: dCase });
});
