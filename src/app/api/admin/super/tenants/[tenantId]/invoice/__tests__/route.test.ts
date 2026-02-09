import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireRole = vi.fn();
const mockIssueDistrictInvoice = vi.fn();

vi.mock('@/lib/auth', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/super-admin', () => ({ issueDistrictInvoice: mockIssueDistrictInvoice }));

describe('POST /api/admin/super/tenants/[tenantId]/invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an invoice for a tenant', async () => {
    const { POST } = await import('../route');
    mockRequireRole.mockResolvedValue({ id: 'admin_1', email: 'admin@rootwork.ai' });
    mockIssueDistrictInvoice.mockResolvedValue({ id: 'in_123', hosted_invoice_url: 'https://stripe.test/in_123', status: 'open' });

    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memo: 'District billing',
        lineItems: [{ description: 'District subscription', unitAmountCents: 499900, quantity: 1 }],
      }),
    });

    const response = await POST(request, { params: { tenantId: 'tenant_1' } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      invoiceId: 'in_123',
      hostedInvoiceUrl: 'https://stripe.test/in_123',
      status: 'open',
    });
  });
});
