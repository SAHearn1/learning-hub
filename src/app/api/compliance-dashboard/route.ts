import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { generateComplianceSnapshot } from '@/lib/compliance-dashboard';

export const GET = withApiHandler(async () => {
  const user = await requireRole([
    'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const snapshot = await generateComplianceSnapshot(user.tenantId);
  return NextResponse.json({ data: snapshot });
});
