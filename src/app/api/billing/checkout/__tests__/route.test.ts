import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockCreateCheckoutSession = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/billing', () => ({ createCheckoutSession: mockCreateCheckoutSession }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.rootwork.test';
  });

  it('returns checkout URL as JSON for API clients', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      email: 'student@example.com',
      tenantId: 'tenant_1',
    });
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/session_1' });

    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'STARTER' }),
    });

    const response = await POST(request, routeContext);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/c/session_1' });
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        userId: 'user_1',
        tier: 'STARTER',
      }),
    );
  });

  it('redirects HTML clients to checkout', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({
      id: 'user_2',
      email: 'teacher@example.com',
      tenantId: 'tenant_2',
    });
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/session_2' });

    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/html',
      },
      body: JSON.stringify({ tier: 'PROFESSIONAL' }),
    });

    const response = await POST(request, routeContext);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://checkout.stripe.com/c/session_2');
  });

  it('returns 400 for invalid payloads', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      email: 'student@example.com',
      tenantId: 'tenant_1',
    });

    const request = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'INVALID_TIER' }),
    });

    const response = await POST(request, routeContext);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
