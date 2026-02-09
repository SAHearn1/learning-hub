import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

const PAID_TIER_PRICE_IDS: Record<Exclude<SubscriptionTier, 'FREE'>, string | undefined> = {
  STARTER: process.env.STRIPE_PRICE_STARTER,
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
};

export const TIER_LIMITS: Record<SubscriptionTier, { sessionsPerMonth: number; aiTokensPerMonth: number }> = {
  FREE: { sessionsPerMonth: 5, aiTokensPerMonth: 50_000 },
  STARTER: { sessionsPerMonth: -1, aiTokensPerMonth: 500_000 },
  PROFESSIONAL: { sessionsPerMonth: -1, aiTokensPerMonth: 2_000_000 },
  ENTERPRISE: { sessionsPerMonth: -1, aiTokensPerMonth: -1 },
};

function normalizeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'trialing') return SubscriptionStatus.TRIALING;
  if (status === 'active') return SubscriptionStatus.ACTIVE;
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return SubscriptionStatus.PAST_DUE;
  return SubscriptionStatus.CANCELLED;
}

export function getStripePriceIdForTier(tier: Exclude<SubscriptionTier, 'FREE'>): string {
  const priceId = PAID_TIER_PRICE_IDS[tier];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${tier}. Set STRIPE_PRICE_${tier}.`);
  }
  return priceId;
}

export function getTierFromStripePriceId(priceId: string): SubscriptionTier {
  const paidEntry = Object.entries(PAID_TIER_PRICE_IDS).find(([, configuredPriceId]) => configuredPriceId === priceId);
  if (paidEntry) {
    return paidEntry[0] as Exclude<SubscriptionTier, 'FREE'>;
  }
  return SubscriptionTier.FREE;
}

async function ensureStripeCustomer(tenantId: string, email?: string) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found.');

  if (tenant.stripeCustomerId) {
    return { tenant, stripeCustomerId: tenant.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { tenantId },
  });

  const updatedTenant = await db.tenant.update({
    where: { id: tenant.id },
    data: { stripeCustomerId: customer.id },
  });

  return { tenant: updatedTenant, stripeCustomerId: customer.id };
}

export async function createCheckoutSession(params: {
  tenantId: string;
  userId: string;
  email?: string;
  tier: Exclude<SubscriptionTier, 'FREE'>;
  successUrl: string;
  cancelUrl: string;
}) {
  const { tenantId, userId, email, tier, successUrl, cancelUrl } = params;
  const priceId = getStripePriceIdForTier(tier);
  const { stripeCustomerId } = await ensureStripeCustomer(tenantId, email);

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      userId,
      targetTier: tier,
    },
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession(params: { tenantId: string; email?: string; returnUrl: string }) {
  const { stripeCustomerId } = await ensureStripeCustomer(params.tenantId, params.email);

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: params.returnUrl,
  });
}

export async function createDistrictInvoice(params: {
  tenantId: string;
  initiatedByUserId: string;
  email?: string;
  memo?: string;
  lineItems: Array<{ description: string; unitAmountCents: number; quantity?: number }>;
  collectionMethod?: 'send_invoice' | 'charge_automatically';
  daysUntilDue?: number;
}) {
  const {
    tenantId,
    initiatedByUserId,
    email,
    memo,
    lineItems,
    collectionMethod = 'send_invoice',
    daysUntilDue = 30,
  } = params;

  if (!lineItems.length) {
    throw new Error('At least one invoice line item is required.');
  }

  const { stripeCustomerId } = await ensureStripeCustomer(tenantId, email);

  await Promise.all(
    lineItems.map((item) =>
      stripe.invoiceItems.create({
        customer: stripeCustomerId,
        currency: 'usd',
        unit_amount: item.unitAmountCents,
        quantity: item.quantity ?? 1,
        description: item.description,
        metadata: {
          tenantId,
          initiatedByUserId,
        },
      }),
    ),
  );

  const invoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    auto_advance: false,
    collection_method: collectionMethod,
    ...(collectionMethod === 'send_invoice' ? { days_until_due: daysUntilDue } : {}),
    metadata: {
      tenantId,
      initiatedByUserId,
      billingType: 'district_invoice',
    },
    description: memo,
  });

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

  if (collectionMethod === 'send_invoice') {
    await stripe.invoices.sendInvoice(finalizedInvoice.id);
  }

  return finalizedInvoice;
}

export async function syncTenantFromSubscription(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata.tenantId;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  if (!tenantId) {
    const tenantFromCustomer = await db.tenant.findFirst({ where: { stripeCustomerId: customerId } });
    if (!tenantFromCustomer) return;

    await db.tenant.update({
      where: { id: tenantFromCustomer.id },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: normalizeStatus(subscription.status),
      },
    });
    return;
  }

  const activePrice = subscription.items.data[0]?.price?.id;
  const tier = activePrice ? getTierFromStripePriceId(activePrice) : SubscriptionTier.FREE;

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionTier: tier,
      subscriptionStatus: normalizeStatus(subscription.status),
    },
  });
}

export async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata.tenantId;
  if (!tenantId) return;

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: SubscriptionStatus.CANCELLED,
      stripeSubscriptionId: null,
    },
  });
}
