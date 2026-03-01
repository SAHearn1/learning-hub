import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { getEventsForStudent } from '@/lib/safeguards/procedural-safeguards.service';

export const GET = withApiHandler(async (_req, ctx) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const { studentId } = ctx.params;

  const events = await getEventsForStudent(user.tenantId, studentId);

  return NextResponse.json({ data: events });
});
