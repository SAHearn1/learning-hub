import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const resource = url.searchParams.get('resource');

  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (action) where.action = { contains: action };
  if (resource) where.resource = { contains: resource };

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  return NextResponse.json({ data: logs });
}
