import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withApiHandler(async (_req, ctx) => {
  await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN', 'PARENT',
  ]);

  const transitions = await db.evalStateTransition.findMany({
    where: { caseId: ctx.params.caseId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: transitions });
});
