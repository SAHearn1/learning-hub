import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- SRS lib mocks ---
const mockGetDueItems = vi.fn();
const mockSubmitReview = vi.fn();
const mockGetReviewStats = vi.fn();
const mockGenerateDailyWarmup = vi.fn();

// --- Auth mock (named so individual tests can reject it) ---
const mockRequireUser = vi.fn();

vi.mock('@/lib/srs', () => ({
  getDueItems: mockGetDueItems,
  submitReview: mockSubmitReview,
  getReviewStats: mockGetReviewStats,
  generateDailyWarmup: mockGenerateDailyWarmup,
  ReviewRating: { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 },
}));

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser, requireRole: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };
const authenticatedUser = {
  id: 'user_1',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  isMinor: false,
  consentStatus: 'GRANTED',
};

// ---------------------------------------------------------------------------
// GET /api/srs/due-items
// ---------------------------------------------------------------------------
describe('GET /api/srs/due-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(authenticatedUser);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId is missing', async () => {
    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/studentId/i);
  });

  it('returns 400 for invalid subject param', async () => {
    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items?studentId=stu_1&subject=HISTORY');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns due items with count and items array', async () => {
    const items = [
      { id: 'item_1', subject: 'MATH', nextReviewAt: new Date().toISOString() },
      { id: 'item_2', subject: 'MATH', nextReviewAt: new Date().toISOString() },
    ];
    mockGetDueItems.mockResolvedValue(items);

    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items?studentId=stu_1&subject=MATH&limit=10');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(mockGetDueItems).toHaveBeenCalledWith('stu_1', 'MATH', 10);
  });

  it('returns empty list when no items are due', async () => {
    mockGetDueItems.mockResolvedValue([]);

    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  it('accepts subject filter query param and passes it to getDueItems', async () => {
    mockGetDueItems.mockResolvedValue([]);

    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items?studentId=stu_1&subject=SCIENCE');
    await GET(req, routeContext);
    expect(mockGetDueItems).toHaveBeenCalledWith('stu_1', 'SCIENCE', undefined);
  });

  it('passes undefined limit when not specified', async () => {
    mockGetDueItems.mockResolvedValue([]);

    const { GET } = await import('@/app/api/srs/due-items/route');
    const req = new NextRequest('http://localhost/api/srs/due-items?studentId=stu_1');
    await GET(req, routeContext);
    expect(mockGetDueItems).toHaveBeenCalledWith('stu_1', undefined, undefined);
  });
});

// ---------------------------------------------------------------------------
// POST /api/srs/review
// ---------------------------------------------------------------------------
describe('POST /api/srs/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(authenticatedUser);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ scheduleId: 'sched_1', rating: 3 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 when scheduleId is missing', async () => {
    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ rating: 3 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/scheduleId/i);
  });

  it('returns 400 when rating is missing', async () => {
    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ scheduleId: 'sched_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid rating value', async () => {
    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ scheduleId: 'sched_1', rating: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid rating/i);
  });

  it('returns 404 when schedule is not found', async () => {
    mockSubmitReview.mockRejectedValue(new Error('Schedule not found'));

    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ scheduleId: 'sched_missing', rating: 3 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('submits review and returns success message', async () => {
    mockSubmitReview.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ scheduleId: 'sched_1', rating: 3 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Review submitted successfully');
    expect(mockSubmitReview).toHaveBeenCalledWith('sched_1', 3, undefined);
  });

  it('passes responseTime to submitReview', async () => {
    mockSubmitReview.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/srs/review/route');
    const req = new NextRequest('http://localhost/api/srs/review', {
      method: 'POST',
      body: JSON.stringify({ scheduleId: 'sched_1', rating: 4, responseTime: 1500 }),
    });
    await POST(req, routeContext);
    expect(mockSubmitReview).toHaveBeenCalledWith('sched_1', 4, 1500);
  });

  it('accepts all valid rating values (1-4)', async () => {
    mockSubmitReview.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/srs/review/route');

    for (const rating of [1, 2, 3, 4]) {
      const req = new NextRequest('http://localhost/api/srs/review', {
        method: 'POST',
        body: JSON.stringify({ scheduleId: 'sched_1', rating }),
      });
      const res = await POST(req, routeContext);
      expect(res.status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/srs/stats
// ---------------------------------------------------------------------------
describe('GET /api/srs/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(authenticatedUser);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/srs/stats/route');
    const req = new NextRequest('http://localhost/api/srs/stats?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId is missing', async () => {
    const { GET } = await import('@/app/api/srs/stats/route');
    const req = new NextRequest('http://localhost/api/srs/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/studentId/i);
  });

  it('returns 400 for invalid subject', async () => {
    const { GET } = await import('@/app/api/srs/stats/route');
    const req = new NextRequest('http://localhost/api/srs/stats?studentId=stu_1&subject=HISTORY');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns stats object with expected shape', async () => {
    const stats = {
      totalScheduled: 50,
      dueToday: 10,
      dueThisWeek: 25,
      newCards: 5,
      learningCards: 8,
      reviewCards: 37,
      masteredCards: 30,
      averageRetention: 0.85,
    };
    mockGetReviewStats.mockResolvedValue(stats);

    const { GET } = await import('@/app/api/srs/stats/route');
    const req = new NextRequest('http://localhost/api/srs/stats?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalScheduled).toBe(50);
    expect(body.dueToday).toBe(10);
    expect(body.masteredCards).toBe(30);
    expect(body.averageRetention).toBe(0.85);
    expect(mockGetReviewStats).toHaveBeenCalledWith('stu_1', undefined);
  });

  it('filters stats by subject when provided', async () => {
    mockGetReviewStats.mockResolvedValue({ totalScheduled: 20, dueToday: 5 });

    const { GET } = await import('@/app/api/srs/stats/route');
    const req = new NextRequest('http://localhost/api/srs/stats?studentId=stu_1&subject=SCIENCE');
    await GET(req, routeContext);
    expect(mockGetReviewStats).toHaveBeenCalledWith('stu_1', 'SCIENCE');
  });
});

// ---------------------------------------------------------------------------
// GET /api/srs/warmup
// ---------------------------------------------------------------------------
describe('GET /api/srs/warmup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(authenticatedUser);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId is missing', async () => {
    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid subject', async () => {
    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1&subject=INVALID');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns warmup items array', async () => {
    const warmup = {
      newItems: [{ id: 'item_1', subject: 'MATH' }],
      learningItems: [{ id: 'item_2', subject: 'MATH' }],
      reviewItems: Array.from({ length: 3 }, (_, i) => ({ id: `rev_${i}`, subject: 'MATH' })),
      totalDue: 5,
      estimatedMinutes: 8,
    };
    mockGenerateDailyWarmup.mockResolvedValue(warmup);

    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDue).toBe(5);
    expect(body.estimatedMinutes).toBe(8);
    expect(mockGenerateDailyWarmup).toHaveBeenCalledWith('stu_1', undefined, 20);
  });

  it('uses default maxItems=20 when not specified', async () => {
    mockGenerateDailyWarmup.mockResolvedValue({ items: [], estimatedDuration: 0 });

    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1');
    await GET(req, routeContext);
    expect(mockGenerateDailyWarmup).toHaveBeenCalledWith('stu_1', undefined, 20);
  });

  it('respects custom maxItems param', async () => {
    mockGenerateDailyWarmup.mockResolvedValue({ items: [], estimatedDuration: 0 });

    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1&maxItems=10');
    await GET(req, routeContext);
    expect(mockGenerateDailyWarmup).toHaveBeenCalledWith('stu_1', undefined, 10);
  });

  it('returns empty warmup when student has no cards', async () => {
    mockGenerateDailyWarmup.mockResolvedValue({
      newItems: [],
      learningItems: [],
      reviewItems: [],
      totalDue: 0,
      estimatedMinutes: 0,
    });

    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDue).toBe(0);
  });
});
