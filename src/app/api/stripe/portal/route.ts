import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, NotFoundError } from '@/lib/api-errors';

export const POST = withApiHandler(async () => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError('Unauthorized');
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { tenant: true },
  });
  if (!user?.tenant.stripeCustomerId) {
    throw new NotFoundError('No billing account found');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.tenant.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ data: { url: portalSession.url } });
});
