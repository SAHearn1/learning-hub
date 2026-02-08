import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReturnValue({ userId: 'clerk_1' });
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      student: { id: 'student_1' },
    });
    mockEnforceUsageLimits.mockResolvedValue({});
    mockDb.session.create.mockResolvedValue({ id: 'session_1' });
  });

  it('creates a session when within usage limits', async () => {
    const { POST } = await import('../route');

    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'MATH', engagementMode: 'FORWARD' }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(201);
    expect(mockEnforceUsageLimits).toHaveBeenCalledWith('tenant_1');
    expect(mockDb.session.create).toHaveBeenCalled();
  });

  it('returns 402 when usage limits are exceeded', async () => {
    const { POST } = await import('../route');
    const { UsageLimitError } = await import('@/lib/usage-limits');
    mockEnforceUsageLimits.mockRejectedValue(new UsageLimitError('Monthly session limit reached for current subscription tier.'));

    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'SCIENCE' }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      error: 'Monthly session limit reached for current subscription tier.',
    });
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });
});
