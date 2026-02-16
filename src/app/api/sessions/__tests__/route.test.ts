import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockDb = {
  session: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  topic: { findUnique: vi.fn() },
};
const mockEnforceUsageLimits = vi.fn();
const mockHasRequiredMinorConsent = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/usage-limits', async () => {
  const actual = await vi.importActual<typeof import('@/lib/usage-limits')>('@/lib/usage-limits');
  return {
    ...actual,
    enforceUsageLimits: mockEnforceUsageLimits,
  };
});
vi.mock('@/lib/compliance', () => ({
  hasRequiredMinorConsent: mockHasRequiredMinorConsent,
}));
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

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      isMinor: false,
      consentStatus: null,
      student: { id: 'student_1' },
    });
    mockHasRequiredMinorConsent.mockReturnValue(true);
    mockEnforceUsageLimits.mockResolvedValue({});
    mockDb.session.create.mockResolvedValue({ id: 'session_1' });
  });

  it('creates a session when within usage limits', async () => {
    const { POST } = await import('../route');

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'MATH', engagementMode: 'FORWARD' }),
    });

    const response = await POST(request, routeContext);

    expect(response.status).toBe(201);
    expect(mockEnforceUsageLimits).toHaveBeenCalledWith('tenant_1');
    expect(mockDb.session.create).toHaveBeenCalled();
  });

  it('returns 402 when usage limits are exceeded', async () => {
    const { POST } = await import('../route');
    const { UsageLimitError } = await import('@/lib/usage-limits');
    mockEnforceUsageLimits.mockRejectedValue(new UsageLimitError('Monthly session limit reached for current subscription tier.'));

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'SCIENCE' }),
    });

    const response = await POST(request, routeContext);
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.error).toBe('Monthly session limit reached for current subscription tier.');
    expect(body.code).toBe('PAYMENT_REQUIRED');
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });
});
