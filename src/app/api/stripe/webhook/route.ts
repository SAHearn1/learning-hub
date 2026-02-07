import { NextResponse } from 'next/server';
import { handleSubscriptionCanceled, syncTenantFromSubscription } from '@/lib/billing';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

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
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }
}
