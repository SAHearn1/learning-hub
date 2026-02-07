import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

const tierMap: Record<string, 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'> = {
  free: 'FREE',
  starter: 'STARTER',
  professional: 'PROFESSIONAL',
  enterprise: 'ENTERPRISE',
};

function resolveTier(subscription: Stripe.Subscription): 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' {
  const productMeta = subscription.metadata?.tier;
  if (productMeta && tierMap[productMeta]) return tierMap[productMeta];
  return 'STARTER';
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      if (tenantId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await db.tenant.update({
          where: { id: tenantId },
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionTier: resolveTier(subscription),
            subscriptionStatus: 'ACTIVE',
          },
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const tenant = await db.tenant.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (tenant) {
          await db.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: 'ACTIVE' },
          });
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const tenant = await db.tenant.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (tenant) {
        const status = subscription.status === 'active' ? 'ACTIVE'
          : subscription.status === 'past_due' ? 'PAST_DUE'
          : subscription.status === 'trialing' ? 'TRIALING'
          : 'CANCELLED';
        await db.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionTier: resolveTier(subscription),
            subscriptionStatus: status,
          },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const tenant = await db.tenant.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (tenant) {
        await db.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionTier: 'FREE',
            subscriptionStatus: 'CANCELLED',
            stripeSubscriptionId: null,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
