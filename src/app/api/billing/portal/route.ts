import { NextResponse } from 'next/server';
import { createBillingPortalSession } from '@/lib/billing';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireUser();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await createBillingPortalSession({
      tenantId: user.tenantId,
      email: user.email,
      returnUrl: `${appUrl}/settings`,
    });

    return NextResponse.redirect(session.url);
  } catch {
    return NextResponse.redirect(new URL('/settings?billing=error', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  }
}
