import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionTier } from '@prisma/client';

const mockDb = {
  tenant: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const mockStripe = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/stripe', () => ({ stripe: mockStripe }));

describe('billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_STARTER = 'price_starter';
    process.env.STRIPE_PRICE_PROFESSIONAL = 'price_pro';
    process.env.STRIPE_PRICE_ENTERPRISE = 'price_ent';
  });

  it('creates checkout session with subscription mode', async () => {
    const { createCheckoutSession } = await import('../billing');

    mockDb.tenant.findUnique.mockResolvedValue({ id: 't1', stripeCustomerId: 'cus_123' });
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });

    const session = await createCheckoutSession({
      tenantId: 't1',
      userId: 'u1',
      email: 'test@example.com',
      tier: SubscriptionTier.STARTER,
      successUrl: 'https://app.test/success',
      cancelUrl: 'https://app.test/cancel',
    });

    expect(session.url).toContain('checkout.stripe.com');
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_starter', quantity: 1 }],
      }),
    );
  });

  it('downgrades to free tier on canceled subscription', async () => {
    const { handleSubscriptionCanceled } = await import('../billing');

    await handleSubscriptionCanceled({ metadata: { tenantId: 'tenant_1' } } as never);

    expect(mockDb.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant_1' },
        data: expect.objectContaining({ subscriptionTier: SubscriptionTier.FREE }),
      }),
    );
  });
});
