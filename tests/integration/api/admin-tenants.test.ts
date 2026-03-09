import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockIssueDistrictInvoice = vi.fn();
const mockSetTenantSuspension = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/super-admin', () => ({
  issueDistrictInvoice: mockIssueDistrictInvoice,
  setTenantSuspension: mockSetTenantSuspension,
  createManualIntervention: vi.fn(),
  getSuperAdminDashboardData: vi.fn(),
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

const platformAdmin = {
  id: 'user_admin',
  email: 'admin@rootwork.app',
  tenantId: 'tenant_platform',
  role: 'PLATFORM_ADMIN',
};

const schoolAdmin = {
  id: 'user_school',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

function tenantCtx(tenantId = 'tenant_1') {
  return { params: Promise.resolve({ tenantId }) };
}

const validLineItem = {
  description: 'Monthly platform fee',
  unitAmountCents: 50000,
  quantity: 1,
};

// ─── POST /api/admin/super/tenants/[tenantId]/invoice ────────────────────────

describe('POST /api/admin/super/tenants/[tenantId]/invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/invoice',
      {
        method: 'POST',
        body: JSON.stringify({ lineItems: [validLineItem] }),
      },
    );
    const res = await POST(req, tenantCtx());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-PLATFORM_ADMIN role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/invoice',
      {
        method: 'POST',
        body: JSON.stringify({ lineItems: [validLineItem] }),
      },
    );
    const res = await POST(req, tenantCtx());
    expect(res.status).toBe(403);
  });

  it('returns 400 when lineItems array is empty', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/invoice',
      {
        method: 'POST',
        body: JSON.stringify({ lineItems: [] }),
      },
    );
    const res = await POST(req, tenantCtx());
    expect(res.status).toBe(400);
  });

  it('returns 400 when lineItem description is too short', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/invoice',
      {
        method: 'POST',
        body: JSON.stringify({
          lineItems: [{ description: 'X', unitAmountCents: 1000 }],
        }),
      },
    );
    const res = await POST(req, tenantCtx());
    expect(res.status).toBe(400);
  });

  it('returns 400 when unitAmountCents is not a positive integer', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/invoice',
      {
        method: 'POST',
        body: JSON.stringify({
          lineItems: [{ description: 'Valid description', unitAmountCents: -100 }],
        }),
      },
    );
    const res = await POST(req, tenantCtx());
    expect(res.status).toBe(400);
  });

  it('creates invoice and returns invoice details for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockIssueDistrictInvoice.mockResolvedValue({
      id: 'inv_abc123',
      hosted_invoice_url: 'https://invoice.stripe.com/i/abc123',
      status: 'open',
    });
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/invoice',
      {
        method: 'POST',
        body: JSON.stringify({
          memo: 'Q1 billing',
          lineItems: [validLineItem],
        }),
      },
    );
    const res = await POST(req, tenantCtx('tenant_1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoiceId).toBe('inv_abc123');
    expect(body.hostedInvoiceUrl).toBe('https://invoice.stripe.com/i/abc123');
    expect(body.status).toBe('open');
    expect(mockIssueDistrictInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        actorUserId: 'user_admin',
        actorEmail: 'admin@rootwork.app',
        memo: 'Q1 billing',
        lineItems: [validLineItem],
      }),
    );
  });

  it('creates invoice without optional memo field', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockIssueDistrictInvoice.mockResolvedValue({
      id: 'inv_xyz789',
      hosted_invoice_url: 'https://invoice.stripe.com/i/xyz789',
      status: 'draft',
    });
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/invoice/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_2/invoice',
      {
        method: 'POST',
        body: JSON.stringify({ lineItems: [validLineItem] }),
      },
    );
    const res = await POST(req, tenantCtx('tenant_2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoiceId).toBe('inv_xyz789');
    expect(mockIssueDistrictInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ memo: undefined }),
    );
  });
});

// ─── PATCH /api/admin/super/tenants/[tenantId]/suspension ────────────────────

describe('PATCH /api/admin/super/tenants/[tenantId]/suspension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { PATCH } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/suspension/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/suspension',
      {
        method: 'PATCH',
        body: JSON.stringify({ suspend: true }),
      },
    );
    const res = await PATCH(req, tenantCtx());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-PLATFORM_ADMIN role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { PATCH } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/suspension/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/suspension',
      {
        method: 'PATCH',
        body: JSON.stringify({ suspend: true }),
      },
    );
    const res = await PATCH(req, tenantCtx());
    expect(res.status).toBe(403);
  });

  it('returns 400 when suspend field is missing', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const { PATCH } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/suspension/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/suspension',
      {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Non-payment' }),
      },
    );
    const res = await PATCH(req, tenantCtx());
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason exceeds max length', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const { PATCH } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/suspension/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/suspension',
      {
        method: 'PATCH',
        body: JSON.stringify({
          suspend: true,
          reason: 'x'.repeat(281),
        }),
      },
    );
    const res = await PATCH(req, tenantCtx());
    expect(res.status).toBe(400);
  });

  it('suspends tenant and returns updated status for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const suspendedAt = new Date().toISOString();
    mockSetTenantSuspension.mockResolvedValue({
      id: 'tenant_1',
      isSuspended: true,
      suspendedAt,
      suspensionReason: 'Non-payment after 90 days',
    });
    const { PATCH } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/suspension/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/suspension',
      {
        method: 'PATCH',
        body: JSON.stringify({
          suspend: true,
          reason: 'Non-payment after 90 days',
        }),
      },
    );
    const res = await PATCH(req, tenantCtx('tenant_1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantId).toBe('tenant_1');
    expect(body.isSuspended).toBe(true);
    expect(body.suspendedAt).toBe(suspendedAt);
    expect(body.suspensionReason).toBe('Non-payment after 90 days');
    expect(mockSetTenantSuspension).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        actorUserId: 'user_admin',
        suspend: true,
        reason: 'Non-payment after 90 days',
      }),
    );
  });

  it('unsuspends tenant when suspend is false', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockSetTenantSuspension.mockResolvedValue({
      id: 'tenant_1',
      isSuspended: false,
      suspendedAt: null,
      suspensionReason: null,
    });
    const { PATCH } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/suspension/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_1/suspension',
      {
        method: 'PATCH',
        body: JSON.stringify({ suspend: false }),
      },
    );
    const res = await PATCH(req, tenantCtx('tenant_1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isSuspended).toBe(false);
    expect(body.suspendedAt).toBeNull();
    expect(mockSetTenantSuspension).toHaveBeenCalledWith(
      expect.objectContaining({ suspend: false }),
    );
  });
});
