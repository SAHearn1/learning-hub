import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleSubscriptionCanceled, syncTenantFromSubscription } from '@/lib/billing';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    console.error('Missing Stripe signature header.');
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed.', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.subscription && typeof session.subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncTenantFromSubscription(subscription);
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      await syncTenantFromSubscription(event.data.object);
    }

    if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionCanceled(event.data.object);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed.', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
