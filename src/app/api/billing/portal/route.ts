import { NextResponse } from 'next/server';
import { createBillingPortalSession } from '@/lib/billing';
import { requireRole } from '@/lib/auth';
import { withApiHandler } from '@/lib/api-handler';

export const POST = withApiHandler(async () => {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await createBillingPortalSession({
    tenantId: user.tenantId,
    email: user.email,
    returnUrl: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
});
