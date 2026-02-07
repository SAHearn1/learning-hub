import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireUser = vi.fn();
const mockCreateBillingPortalSession = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/billing', () => ({ createBillingPortalSession: mockCreateBillingPortalSession }));

describe('GET /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.rootwork.test';
  });

  it('redirects to Stripe billing portal on success', async () => {
    const { GET } = await import('../route');
    mockRequireUser.mockResolvedValue({ email: 'owner@example.com', tenantId: 'tenant_1' });
    mockCreateBillingPortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/p/session_1' });

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://billing.stripe.com/p/session_1');
  });

  it('redirects back to settings with billing error when a failure occurs', async () => {
    const { GET } = await import('../route');
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.rootwork.test/settings?billing=error');
  });
});
