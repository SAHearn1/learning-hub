import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockGetReviewStats = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/ai/hitl/suggestion-service', () => ({
  getReviewStats: mockGetReviewStats,
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

const routeContext = { params: Promise.resolve({}) };

describe('GET /api/educator/reviews/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/educator/reviews/stats/route');

    const req = new NextRequest('http://localhost/api/educator/reviews/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { GET } = await import('@/app/api/educator/reviews/stats/route');

    const req = new NextRequest('http://localhost/api/educator/reviews/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'PARENT' });
    const { GET } = await import('@/app/api/educator/reviews/stats/route');

    const req = new NextRequest('http://localhost/api/educator/reviews/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns review stats for educator', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'EDUCATOR' });
    const stats = {
      pendingCount: 5,
      approvedToday: 3,
      rejectedToday: 1,
      averageReviewTimeMs: 45000,
      approvalRate: 0.75,
    };
    mockGetReviewStats.mockResolvedValue(stats);
    const { GET } = await import('@/app/api/educator/reviews/stats/route');

    const req = new NextRequest('http://localhost/api/educator/reviews/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.pendingCount).toBe(5);
    expect(body.data.approvedToday).toBe(3);
    expect(body.data.approvalRate).toBe(0.75);
    expect(mockGetReviewStats).toHaveBeenCalledWith('tenant_1');
  });
});
