/**
 * POST /api/billing/checkout
 *
 * Higher-level checkout endpoint used by the application UI.
 * Accepts a subscription TIER name (STARTER | PROFESSIONAL | ENTERPRISE)
 * and supports both JSON and HTML form submissions (browser redirects).
 * Delegates to the @/lib/billing abstraction layer which encapsulates
 * Stripe API details and tier-to-priceId mapping.
 *
 * Distinct from /api/stripe/checkout which is a lower-level endpoint
 * that accepts a raw Stripe priceId and is intended for direct API
 * integrations where the caller manages its own priceId mapping.
 */
import { SubscriptionTier } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/lib/billing';
import { requireRole } from '@/lib/auth';
import { withApiHandler } from '@/lib/api-handler';

const requestSchema = z.object({
  tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
});

async function parseTier(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return requestSchema.parse(await request.json()).tier;
  }

  const formData = await request.formData();
  return requestSchema.parse({ tier: formData.get('tier') }).tier;
}

export const POST = withApiHandler(async (request) => {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const tier = await parseTier(request);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await createCheckoutSession({
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    tier: tier as Exclude<SubscriptionTier, 'FREE'>,
    successUrl: `${appUrl}/settings?checkout=success`,
    cancelUrl: `${appUrl}/settings?checkout=cancelled`,
  });

  if ((request.headers.get('accept') ?? '').includes('text/html')) {
    return NextResponse.redirect(session.url ?? `${appUrl}/settings?checkout=error`);
  }

  return NextResponse.json({ url: session.url });
});
