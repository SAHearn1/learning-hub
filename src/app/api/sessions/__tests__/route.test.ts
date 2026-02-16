import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockDb = {
  session: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  topic: { findUnique: vi.fn() },
  tenant: { findUnique: vi.fn() },
  student: { upsert: vi.fn() },
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
      role: 'STUDENT',
      isMinor: false,
      consentStatus: null,
      student: { id: 'student_1' },
    });
    mockHasRequiredMinorConsent.mockReturnValue(true);
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant_1' });
    mockDb.student.upsert.mockResolvedValue({ id: 'student_1' });
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

  it('auto-creates a student profile for student-role users missing student relation', async () => {
    const { POST } = await import('../route');
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      isMinor: false,
      consentStatus: null,
      student: null,
    });

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'MATH' }),
    });

    const response = await POST(request, routeContext);

    expect(response.status).toBe(201);
    expect(mockDb.student.upsert).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      update: {},
      create: {
        userId: 'user_1',
        gradeLevel: 6,
        learningPreferences: {},
        regulationProfile: {
          dysregulationTriggers: [],
          calmingStrategies: [],
          preferredBreakDuration: 5,
        },
      },
      select: { id: true },
    });
    expect(mockDb.session.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        studentId: 'student_1',
      }),
    }));
  });

  it('returns 404 when tenant cannot be found', async () => {
    const { POST } = await import('../route');
    mockDb.tenant.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject: 'MATH' }),
    });

    const response = await POST(request, routeContext);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.error).toBe('Tenant not found for current user');
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });
});
