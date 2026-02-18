import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSuperAdminDashboardData } from '@/lib/super-admin';
import { withApiHandler } from '@/lib/api-handler';

export const GET = withApiHandler(async (req, ctx) => {
  await requireRole(['PLATFORM_ADMIN']);
  const data = await getSuperAdminDashboardData();
  return NextResponse.json(data);
});
