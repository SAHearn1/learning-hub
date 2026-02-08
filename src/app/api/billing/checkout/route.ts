import { SubscriptionTier } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/lib/billing';
import { requireUser } from '@/lib/auth';
import { withApiHandler } from '@/lib/api-handler';

const requestSchema = z.object({
  tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
});

async function parseTier(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return requestSchema.parse(await request.json()).tier;
  }

  const formData = await request.formData();
  return requestSchema.parse({ tier: formData.get('tier') }).tier;
}

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();
  const tier = await parseTier(req);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await createCheckoutSession({
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    tier: tier as Exclude<SubscriptionTier, 'FREE'>,
    successUrl: `${appUrl}/settings?checkout=success`,
    cancelUrl: `${appUrl}/settings?checkout=cancelled`,
  });

  if ((req.headers.get('accept') ?? '').includes('text/html')) {
    return NextResponse.redirect(session.url ?? `${appUrl}/settings?checkout=error`);
  }

  return NextResponse.json({ url: session.url });
}, { rateLimit: { windowMs: 60_000, max: 30 } });
