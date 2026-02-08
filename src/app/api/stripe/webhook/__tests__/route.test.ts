import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

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

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/monitoring', () => ({ captureError: vi.fn() }));

function makeRequest(headers?: Record<string, string>, body = '{}') {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('returns 400 when signature or secret is missing', async () => {
    const { POST } = await import('../route');
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Webhook signature verification failed.');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('syncs tenant after checkout session completion with a subscription id', async () => {
    const { POST } = await import('../route');
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_123' } },
    });
    mockRetrieveSubscription.mockResolvedValue({ id: 'sub_123', metadata: { tenantId: 'tenant_1' } });

    const response = await POST(
      makeRequest({ 'stripe-signature': 'sig_123' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
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

    const response = await POST(
      makeRequest({ 'stripe-signature': 'sig_456' }),
    );

    expect(response.status).toBe(200);
    expect(mockHandleSubscriptionCanceled).toHaveBeenCalledWith(deletedSubscription);
  });

  it('returns 400 when Stripe event parsing fails', async () => {
    const { POST } = await import('../route');
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Bad signature');
    });

    const response = await POST(
      makeRequest({ 'stripe-signature': 'sig_invalid' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid webhook payload.');
  });

  it('includes X-Request-Id header on all responses', async () => {
    const { POST } = await import('../route');
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(makeRequest());

    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });
});
