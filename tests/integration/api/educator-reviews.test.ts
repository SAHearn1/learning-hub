import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockGetReviewQueue = vi.fn();
const mockGetCompletedReviews = vi.fn();
const mockSubmitReview = vi.fn();
const mockAppendAuditLog = vi.fn();
const mockStudentFindMany = vi.fn();
const mockUserFindMany = vi.fn();
const mockReviewFindUnique = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/ai/hitl/suggestion-service', () => ({
  getReviewQueue: mockGetReviewQueue,
  getCompletedReviews: mockGetCompletedReviews,
  submitReview: mockSubmitReview,
  SubmitReviewSchema: {},
}));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAppendAuditLog }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { findMany: mockStudentFindMany },
    user: { findMany: mockUserFindMany },
    aiSuggestionReview: { findUnique: mockReviewFindUnique },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };
const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };

function setupStudentNameMocks() {
  mockStudentFindMany.mockResolvedValue([{ id: 'stu_1', userId: 'user_stu_1' }]);
  mockUserFindMany.mockResolvedValue([{ id: 'user_stu_1', firstName: 'Alice', lastName: 'Smith' }]);
}

describe('GET /api/educator/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { GET } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns pending reviews enriched with student names', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockGetReviewQueue.mockResolvedValue({
      data: [{ id: 'rev_1', studentId: 'stu_1', suggestionType: 'TUTORING_RESPONSE', reviewStatus: 'PENDING_REVIEW' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    setupStudentNameMocks();
    const { GET } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].studentName).toBe('Alice Smith');
    expect(mockGetReviewQueue).toHaveBeenCalledWith('tenant_1', expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('returns completed reviews when status=completed', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockGetCompletedReviews.mockResolvedValue({
      data: [{ id: 'rev_2', studentId: 'stu_1', reviewStatus: 'APPROVED' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    setupStudentNameMocks();
    const { GET } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews?status=completed');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data[0].studentName).toBe('Alice Smith');
    expect(mockGetCompletedReviews).toHaveBeenCalledWith('tenant_1', 1, 20);
  });

  it('respects pagination params', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockGetReviewQueue.mockResolvedValue({ data: [], total: 0, page: 3, limit: 10 });
    mockStudentFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews?page=3&limit=10');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    expect(mockGetReviewQueue).toHaveBeenCalledWith('tenant_1', expect.objectContaining({ page: 3, limit: 10 }));
  });
});

describe('POST /api/educator/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'PARENT' });
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewId: 'rev_1', decision: 'approved' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body (missing reviewId)', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ decision: 'approved' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when review not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockReviewFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewId: 'rev_missing', decision: 'approved' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when review belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockReviewFindUnique.mockResolvedValue({ id: 'rev_1', tenantId: 'tenant_other', reviewStatus: 'PENDING_REVIEW' });
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewId: 'rev_1', decision: 'approved' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when review already processed', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockReviewFindUnique.mockResolvedValue({ id: 'rev_1', tenantId: 'tenant_1', reviewStatus: 'APPROVED' });
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewId: 'rev_1', decision: 'approved' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already been processed');
  });

  it('returns 400 when approved_with_edits but no editedContent', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockReviewFindUnique.mockResolvedValue({ id: 'rev_1', tenantId: 'tenant_1', reviewStatus: 'PENDING_REVIEW' });
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewId: 'rev_1', decision: 'approved_with_edits' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Edited content is required');
  });

  it('returns 200 and submits approved review with audit log', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockReviewFindUnique.mockResolvedValue({
      id: 'rev_1',
      tenantId: 'tenant_1',
      reviewStatus: 'PENDING_REVIEW',
      suggestionType: 'TUTORING_RESPONSE',
      studentId: 'stu_1',
    });
    mockSubmitReview.mockResolvedValue({ id: 'rev_1', reviewStatus: 'APPROVED' });
    const { POST } = await import('@/app/api/educator/reviews/route');

    const req = new NextRequest('http://localhost/api/educator/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewId: 'rev_1', decision: 'approved' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toBe('Review submitted successfully');

    expect(mockSubmitReview).toHaveBeenCalledWith('rev_1', 'user_edu', 'approved', undefined, undefined);
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        action: 'REVIEW_APPROVED',
        resource: 'AiSuggestionReview',
        resourceId: 'rev_1',
      }),
    );
  });
});
