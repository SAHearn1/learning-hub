/**
 * POST /api/stripe/checkout
 *
 * Lower-level checkout endpoint for direct API integrations.
 * Accepts a raw Stripe priceId — the caller is responsible for obtaining
 * the correct priceId (STRIPE_PRICE_STARTER, STRIPE_PRICE_PROFESSIONAL,
 * STRIPE_PRICE_ENTERPRISE env vars).
 *
 * Distinct from /api/billing/checkout which accepts a tier name and
 * supports HTML form submissions; use that endpoint from the application UI.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, NotFoundError, ValidationError } from '@/lib/api-errors';

const ALLOWED_PRICE_IDS = new Set(
  [
    process.env.STRIPE_PRICE_STARTER,
    process.env.STRIPE_PRICE_PROFESSIONAL,
    process.env.STRIPE_PRICE_ENTERPRISE,
  ].filter(Boolean)
);

const checkoutSchema = z.object({
  priceId: z.string().min(1),
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new AuthenticationError('Unauthorized');
  }

  const body = checkoutSchema.parse(await req.json());

  if (!ALLOWED_PRICE_IDS.has(body.priceId)) {
    throw new ValidationError('Invalid price selection');
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { tenant: true },
  });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Create or retrieve Stripe customer
  let customerId = user.tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { tenantId: user.tenantId, userId: user.id },
    });
    customerId = customer.id;
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: body.priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url: `${appUrl}/settings?checkout=cancelled`,
    metadata: { tenantId: user.tenantId },
  });

  return NextResponse.json({ data: { url: session.url } });
});
