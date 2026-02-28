import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleSubscriptionCanceled, syncTenantFromSubscription } from '@/lib/billing';
import { stripe } from '@/lib/stripe';
import { appendImmutableAuditLog } from '@/lib/audit';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

async function logBillingEvent(
  eventType: string,
  customerId: string | null,
  metadata: Record<string, unknown>,
) {
  if (!customerId) return;

  const tenant = await db.tenant.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  if (!tenant) {
    logger.warn('Stripe webhook: no tenant for customer', { customerId, eventType });
    return;
  }

  await appendImmutableAuditLog({
    tenantId: tenant.id,
    userId: 'system:stripe-webhook',
    action: eventType,
    resource: 'billing',
    resourceId: (metadata.invoiceId ?? metadata.subscriptionId ?? null) as string | null,
    metadata,
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    logger.error('Missing Stripe signature header');
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  try {
    switch (event.type) {
      // --- Subscription lifecycle ---
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.subscription && typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncTenantFromSubscription(subscription);
          await logBillingEvent('checkout.session.completed', session.customer as string, {
            subscriptionId: session.subscription,
            tier: subscription.items.data[0]?.price?.id,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await syncTenantFromSubscription(subscription);
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        await logBillingEvent(event.type, customerId, {
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCanceled(subscription);
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        await logBillingEvent('customer.subscription.deleted', customerId, {
          subscriptionId: subscription.id,
        });
        break;
      }

      // --- Invoice lifecycle ---
      case 'invoice.created': {
        const invoice = event.data.object;
        await logBillingEvent('invoice.created', invoice.customer as string, {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        await logBillingEvent('invoice.paid', invoice.customer as string, {
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        logger.warn('Invoice payment failed', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
        });
        await logBillingEvent('invoice.payment_failed', invoice.customer as string, {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt,
        });
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object;
        await logBillingEvent('invoice.finalized', invoice.customer as string, {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          dueDate: invoice.due_date,
        });
        break;
      }

      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing failed', error, { eventType: event.type });
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
