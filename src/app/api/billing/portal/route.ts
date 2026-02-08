import { NextResponse } from 'next/server';
import { createBillingPortalSession } from '@/lib/billing';
import { requireUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await requireUser();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await createBillingPortalSession({
      tenantId: user.tenantId,
      email: user.email,
      returnUrl: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Unable to create billing portal session' }, { status: 500 });
  }
}
