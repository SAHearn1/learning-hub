import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockCreateBillingPortalSession = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/billing', () => ({
  createBillingPortalSession: mockCreateBillingPortalSession,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const schoolAdminUser = {
  id: 'user_school_admin',
  email: 'admin@school.edu',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

const districtAdminUser = {
  id: 'user_district_admin',
  email: 'district@district.edu',
  tenantId: 'tenant_1',
  role: 'DISTRICT_ADMIN',
};

const platformAdminUser = {
  id: 'user_platform_admin',
  email: 'platform@rootwork.app',
  tenantId: 'tenant_platform',
  role: 'PLATFORM_ADMIN',
};

const routeCtx = { params: Promise.resolve({}) };

// ─── POST /api/billing/portal ────────────────────────────────────────────────

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns 403 for EDUCATOR role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns portal URL for SCHOOL_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    mockCreateBillingPortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test_bps_123',
    });
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://billing.stripe.com/session/test_bps_123');
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        email: 'admin@school.edu',
        returnUrl: expect.stringContaining('/settings'),
      }),
    );
  });

  it('returns portal URL for DISTRICT_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(districtAdminUser);
    mockCreateBillingPortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test_bps_456',
    });
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeDefined();
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        email: 'district@district.edu',
      }),
    );
  });

  it('returns portal URL for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdminUser);
    mockCreateBillingPortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test_bps_789',
    });
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeDefined();
  });

  it('propagates service errors when billing session creation fails', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    mockCreateBillingPortalSession.mockRejectedValue(new Error('Stripe API error'));
    const { POST } = await import('@/app/api/billing/portal/route');

    const req = new NextRequest('http://localhost/api/billing/portal', {
      method: 'POST',
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(500);
  });
});
