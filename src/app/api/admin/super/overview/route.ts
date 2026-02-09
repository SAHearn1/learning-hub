import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSuperAdminDashboardData } from '@/lib/super-admin';

export async function GET() {
  try {
    await requireRole(['PLATFORM_ADMIN']);
    const data = await getSuperAdminDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
