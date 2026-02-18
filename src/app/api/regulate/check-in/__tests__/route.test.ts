import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockAuditLog = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAuditLog }));
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

describe('POST /api/regulate/check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      student: { id: 'student_1' },
    });
  });

  it('logs regulation check-ins and returns next-step recommendation', async () => {
    const { POST } = await import('../route');
    const request = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mood: 2,
        energy: 2,
        selectedStrategy: 'Box breathing',
      }),
    });

    const response = await POST(request, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'REGULATION_CHECK_IN',
      resource: 'CALM_CORNER',
      resourceId: 'student_1',
    }));
    expect(body.data.recommendation).toContain('longer break');
  });
});
