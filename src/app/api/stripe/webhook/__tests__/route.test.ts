import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConstructEvent = vi.fn();
const mockRetrieveSubscription = vi.fn();
const mockSyncTenantFromSubscription = vi.fn();
const mockHandleSubscriptionCanceled = vi.fn();

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockRetrieveSubscription },
  },
}));

vi.mock('@/lib/billing', () => ({
  syncTenantFromSubscription: mockSyncTenantFromSubscription,
  handleSubscriptionCanceled: mockHandleSubscriptionCanceled,
}));

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('returns 400 when signature is missing', async () => {
    const { POST } = await import('../route');
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing signature.' });
  });

  it('returns 500 when webhook secret is missing', async () => {
    const { POST } = await import('../route');
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_123' },
      body: '{}',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Webhook not configured.' });
  });

  it('syncs tenant after checkout session completion with a subscription id', async () => {
    const { POST } = await import('../route');
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_123' } },
    });
    mockRetrieveSubscription.mockResolvedValue({ id: 'sub_123', metadata: { tenantId: 'tenant_1' } });

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_123' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mockRetrieveSubscription).toHaveBeenCalledWith('sub_123');
    expect(mockSyncTenantFromSubscription).toHaveBeenCalledWith({ id: 'sub_123', metadata: { tenantId: 'tenant_1' } });
  });

  it('handles subscription deletion webhooks', async () => {
    const { POST } = await import('../route');
    const deletedSubscription = { id: 'sub_456', metadata: { tenantId: 'tenant_2' } };
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: deletedSubscription },
    });

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_456' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockHandleSubscriptionCanceled).toHaveBeenCalledWith(deletedSubscription);
  });

  it('returns 401 when Stripe signature verification fails', async () => {
    const { POST } = await import('../route');
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Bad signature');
    });

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_invalid' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid signature.' });
  });
});
