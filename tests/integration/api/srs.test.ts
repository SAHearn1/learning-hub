import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- SRS lib mocks ---
const mockGetDueItems = vi.fn();
const mockSubmitReview = vi.fn();
const mockGetReviewStats = vi.fn();
const mockGenerateDailyWarmup = vi.fn();

vi.mock('@/lib/srs', () => ({
  getDueItems: mockGetDueItems,
  submitReview: mockSubmitReview,
  getReviewStats: mockGetReviewStats,
  generateDailyWarmup: mockGenerateDailyWarmup,
  ReviewRating: { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 },
}));

// --- Shared infrastructure mocks ---
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
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

// ---------------------------------------------------------------------------
// GET /api/srs/due-items
// ---------------------------------------------------------------------------
describe('GET /api/srs/due-items', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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

  it('returns due items for valid request', async () => {
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
  beforeEach(() => { vi.clearAllMocks(); });

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

  it('returns 200 on successful GOOD review', async () => {
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
});

// ---------------------------------------------------------------------------
// GET /api/srs/stats
// ---------------------------------------------------------------------------
describe('GET /api/srs/stats', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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

  it('returns stats for valid request', async () => {
    const stats = {
      totalCards: 50,
      dueToday: 10,
      masteredCards: 30,
      averageRetention: 0.85,
    };
    mockGetReviewStats.mockResolvedValue(stats);

    const { GET } = await import('@/app/api/srs/stats/route');
    const req = new NextRequest('http://localhost/api/srs/stats?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalCards).toBe(50);
    expect(body.averageRetention).toBe(0.85);
    expect(mockGetReviewStats).toHaveBeenCalledWith('stu_1', undefined);
  });

  it('filters stats by subject when provided', async () => {
    mockGetReviewStats.mockResolvedValue({ totalCards: 20, dueToday: 5 });

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
  beforeEach(() => { vi.clearAllMocks(); });

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

  it('returns warmup set with default maxItems=20', async () => {
    const warmup = {
      items: Array.from({ length: 5 }, (_, i) => ({ id: `item_${i}`, subject: 'MATH' })),
      estimatedDuration: 300,
    };
    mockGenerateDailyWarmup.mockResolvedValue(warmup);

    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(5);
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
    mockGenerateDailyWarmup.mockResolvedValue({ items: [], estimatedDuration: 0 });

    const { GET } = await import('@/app/api/srs/warmup/route');
    const req = new NextRequest('http://localhost/api/srs/warmup?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });
});
