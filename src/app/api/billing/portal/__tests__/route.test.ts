import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthenticationError } from '@/lib/api-errors';

const mockRequireUser = vi.fn();
const mockCreateBillingPortalSession = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/billing', () => ({ createBillingPortalSession: mockCreateBillingPortalSession }));
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

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.rootwork.test';
  });

  it('returns portal URL on success', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({ email: 'owner@example.com', tenantId: 'tenant_1' });
    mockCreateBillingPortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/p/session_1' });

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });

    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe('https://billing.stripe.com/p/session_1');
  });

  it('returns 401 when not authenticated', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });

    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });
});
