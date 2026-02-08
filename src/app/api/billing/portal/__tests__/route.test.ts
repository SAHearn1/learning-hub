import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockCreateBillingPortalSession = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/billing', () => ({ createBillingPortalSession: mockCreateBillingPortalSession }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/monitoring', () => ({ captureError: vi.fn() }));

function makeRequest() {
  return new NextRequest('http://localhost/api/billing/portal', {
    method: 'POST',
  });
}

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.rootwork.test';
  });

  it('returns portal URL on success', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({ email: 'owner@example.com', tenantId: 'tenant_1' });
    mockCreateBillingPortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/p/session_1' });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe('https://billing.stripe.com/p/session_1');
    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('returns 500 when an unexpected failure occurs', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({ email: 'owner@example.com', tenantId: 'tenant_1' });
    mockCreateBillingPortalSession.mockRejectedValue(new Error('Stripe is down'));

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('returns 401 when authentication fails', async () => {
    const { POST } = await import('../route');
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });
});
