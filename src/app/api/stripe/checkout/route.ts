import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';

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

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = checkoutSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!ALLOWED_PRICE_IDS.has(body.priceId)) {
    return NextResponse.json({ error: 'Invalid price selection' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { tenant: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
}
