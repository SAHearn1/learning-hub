import { SubscriptionTier } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/lib/billing';
import { requireUser } from '@/lib/auth';

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

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to create checkout session.' }, { status: 500 });
  }
}
