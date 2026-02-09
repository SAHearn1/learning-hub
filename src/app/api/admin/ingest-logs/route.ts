import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';

export const GET = withApiHandler(async (req, ctx) => {
  await requireRole(['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN']);

  const logs = await db.ingestLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return NextResponse.json({ logs });
});
