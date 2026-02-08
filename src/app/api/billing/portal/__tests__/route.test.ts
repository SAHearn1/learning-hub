import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireUser = vi.fn();
const mockCreateBillingPortalSession = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/billing', () => ({ createBillingPortalSession: mockCreateBillingPortalSession }));

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.rootwork.test';
  });

  it('returns portal URL on success', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({ email: 'owner@example.com', tenantId: 'tenant_1' });
    mockCreateBillingPortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/p/session_1' });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe('https://billing.stripe.com/p/session_1');
  });

  it('returns 500 when a failure occurs', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Unable to create billing portal session');
  });
});
