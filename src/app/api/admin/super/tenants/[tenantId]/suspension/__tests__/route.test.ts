import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireRole = vi.fn();
const mockSetTenantSuspension = vi.fn();

vi.mock('@/lib/auth', () => ({ requireRole: mockRequireRole }));
vi.mock('@/lib/super-admin', () => ({ setTenantSuspension: mockSetTenantSuspension }));

describe('PATCH /api/admin/super/tenants/[tenantId]/suspension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suspends tenant when payload is valid', async () => {
    const { PATCH } = await import('../route');
    mockRequireRole.mockResolvedValue({ id: 'admin_1' });
    mockSetTenantSuspension.mockResolvedValue({
      id: 'tenant_1',
      isSuspended: true,
      suspendedAt: '2026-01-01T00:00:00.000Z',
      suspensionReason: 'Non-payment',
    });

    const request = new NextRequest('http://localhost/api/admin/super/tenants/tenant_1/suspension', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ suspend: true, reason: 'Non-payment' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ tenantId: 'tenant_1' }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        tenantId: 'tenant_1',
        isSuspended: true,
      }),
    );
  });
});
