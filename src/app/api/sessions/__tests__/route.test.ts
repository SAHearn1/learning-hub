import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
const mockDb = {
  user: { findUnique: vi.fn() },
  session: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
};
const mockEnforceUsageLimits = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/usage-limits', async () => {
  const actual = await vi.importActual<typeof import('@/lib/usage-limits')>('@/lib/usage-limits');
  return {
    ...actual,
    enforceUsageLimits: mockEnforceUsageLimits,
  };
});
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/monitoring', () => ({ captureError: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReturnValue({ userId: 'clerk_1' });
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      student: { id: 'student_1' },
      isMinor: false,
      consentStatus: null,
    });
    mockEnforceUsageLimits.mockResolvedValue({});
    mockDb.session.create.mockResolvedValue({ id: 'session_1' });
  });

  it('creates a session when within usage limits', async () => {
    const { POST } = await import('../route');

    const response = await POST(
      makeRequest({ subject: 'MATH', engagementMode: 'FORWARD' }),
    );

    expect(response.status).toBe(201);
    expect(mockEnforceUsageLimits).toHaveBeenCalledWith('tenant_1');
    expect(mockDb.session.create).toHaveBeenCalled();
  });

  it('returns 402 when usage limits are exceeded', async () => {
    const { POST } = await import('../route');
    const { UsageLimitError } = await import('@/lib/usage-limits');
    mockEnforceUsageLimits.mockRejectedValue(
      new UsageLimitError('Monthly session limit reached for current subscription tier.'),
    );

    const response = await POST(makeRequest({ subject: 'SCIENCE' }));
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.error).toBe('Monthly session limit reached for current subscription tier.');
    expect(body.code).toBe('PAYMENT_REQUIRED');
    expect(body.requestId).toBeTruthy();
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });


  it('returns 403 when a minor does not have granted consent', async () => {
    const { POST } = await import('../route');
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      student: { id: 'student_1' },
      isMinor: true,
      consentStatus: 'PENDING',
    });

    const response = await POST(makeRequest({ subject: 'MATH' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toContain('Parental consent is required');
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const { POST } = await import('../route');
    mockAuth.mockReturnValue({ userId: null });

    const response = await POST(makeRequest({ subject: 'MATH' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 400 for invalid request body', async () => {
    const { POST } = await import('../route');

    const response = await POST(makeRequest({ subject: 'INVALID' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('includes X-Request-Id header on all responses', async () => {
    const { POST } = await import('../route');

    const response = await POST(makeRequest({ subject: 'MATH' }));

    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });
});
