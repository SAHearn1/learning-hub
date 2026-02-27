import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockRequireUser = vi.fn();
const mockNvcFindMany = vi.fn();
const mockNvcFindUnique = vi.fn();
const mockNvcUpdate = vi.fn();
const mockGetPendingNVCEvaluations = vi.fn();
const mockGetFlaggedNVCEvaluations = vi.fn();
const mockGetNVCEvaluationStats = vi.fn();
const mockUpdateNVCEvaluationReview = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: mockRequireUser,
}));
vi.mock('@/lib/db', () => ({
  db: {
    nVCQualityEvaluation: {
      findMany: mockNvcFindMany,
      findUnique: mockNvcFindUnique,
      update: mockNvcUpdate,
    },
  },
}));
vi.mock('@/lib/nvc/evaluation-service', () => ({
  getPendingNVCEvaluations: mockGetPendingNVCEvaluations,
  getFlaggedNVCEvaluations: mockGetFlaggedNVCEvaluations,
  getNVCEvaluationStats: mockGetNVCEvaluationStats,
  updateNVCEvaluationReview: mockUpdateNVCEvaluationReview,
}));
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

// ─── Fixtures ───────────────────────────────────────────────────────────────

const adminUser = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'PLATFORM_ADMIN',
};

const sampleEvaluation = {
  id: 'eval_1',
  messageId: 'msg_1',
  sessionId: 'session_1',
  tenantId: 'tenant_1',
  isCompliant: false,
  nvcScore: 45,
  concerns: ['judgmental language'],
  reviewStatus: 'PENDING',
  evaluatedAt: new Date().toISOString(),
  message: {
    id: 'msg_1',
    content: 'You should try harder.',
    role: 'ASSISTANT',
    createdAt: new Date().toISOString(),
  },
};

// ─── GET /api/admin/nvc-evaluations ──────────────────────────────────────────

describe('GET /api/admin/nvc-evaluations', () => {
  const routeCtx = { params: Promise.resolve({}) };

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/admin/nvc-evaluations/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/admin/nvc-evaluations/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns pending evaluations by default', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGetPendingNVCEvaluations.mockResolvedValue([sampleEvaluation]);
    const { GET } = await import('@/app/api/admin/nvc-evaluations/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evaluations).toHaveLength(1);
    expect(mockGetPendingNVCEvaluations).toHaveBeenCalledWith('tenant_1', 50);
  });

  it('returns flagged evaluations when filter=flagged', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGetFlaggedNVCEvaluations.mockResolvedValue([sampleEvaluation]);
    const { GET } = await import('@/app/api/admin/nvc-evaluations/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations?filter=flagged');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    expect(mockGetFlaggedNVCEvaluations).toHaveBeenCalledWith('tenant_1', 50);
  });

  it('returns all evaluations when filter=all', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockNvcFindMany.mockResolvedValue([sampleEvaluation]);
    const { GET } = await import('@/app/api/admin/nvc-evaluations/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations?filter=all');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    expect(mockNvcFindMany).toHaveBeenCalled();
  });

  it('respects limit query param', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGetPendingNVCEvaluations.mockResolvedValue([]);
    const { GET } = await import('@/app/api/admin/nvc-evaluations/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations?limit=10');
    await GET(req, routeCtx);
    expect(mockGetPendingNVCEvaluations).toHaveBeenCalledWith('tenant_1', 10);
  });
});

// ─── GET /api/admin/nvc-evaluations/[id] ─────────────────────────────────────

describe('GET /api/admin/nvc-evaluations/[id]', () => {
  function routeCtx(id = 'eval_1') {
    return { params: Promise.resolve({ id }) };
  }

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/eval_1');
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 404 when evaluation does not exist', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockNvcFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/nonexistent');
    const res = await GET(req, routeCtx('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when evaluation belongs to different tenant', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockNvcFindUnique.mockResolvedValue({ ...sampleEvaluation, tenantId: 'tenant_OTHER' });
    const { GET } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/eval_1');
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(403);
  });

  it('returns evaluation for valid id', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockNvcFindUnique.mockResolvedValue(sampleEvaluation);
    const { GET } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/eval_1');
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evaluation.id).toBe('eval_1');
  });
});

// ─── PATCH /api/admin/nvc-evaluations/[id] ───────────────────────────────────

describe('PATCH /api/admin/nvc-evaluations/[id]', () => {
  function routeCtx(id = 'eval_1') {
    return { params: Promise.resolve({ id }) };
  }

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { PATCH } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/eval_1', {
      method: 'PATCH',
      body: JSON.stringify({ reviewStatus: 'REVIEWED' }),
    });
    const res = await PATCH(req, routeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 404 when evaluation not found', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockNvcFindUnique.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ reviewStatus: 'REVIEWED' }),
    });
    const res = await PATCH(req, routeCtx('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('updates review status successfully', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    // First findUnique: check evaluation exists + tenant
    // Second findUnique: return updated record
    mockNvcFindUnique
      .mockResolvedValueOnce(sampleEvaluation)
      .mockResolvedValueOnce({ ...sampleEvaluation, reviewStatus: 'REVIEWED' });
    mockUpdateNVCEvaluationReview.mockResolvedValue(true);
    const { PATCH } = await import('@/app/api/admin/nvc-evaluations/[id]/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/eval_1', {
      method: 'PATCH',
      body: JSON.stringify({
        reviewStatus: 'REVIEWED',
        reviewNotes: 'Checked and updated.',
        adminAction: 'FALSE_POSITIVE',
      }),
    });
    const res = await PATCH(req, routeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evaluation.reviewStatus).toBe('REVIEWED');
    expect(mockUpdateNVCEvaluationReview).toHaveBeenCalledWith(
      'eval_1',
      expect.objectContaining({ reviewStatus: 'REVIEWED', reviewedBy: 'user_admin' }),
    );
  });
});

// ─── GET /api/admin/nvc-evaluations/stats ────────────────────────────────────

describe('GET /api/admin/nvc-evaluations/stats', () => {
  const routeCtx = { params: Promise.resolve({}) };

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/admin/nvc-evaluations/stats/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/stats');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns stats for admin', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGetNVCEvaluationStats.mockResolvedValue({
      total: 10,
      pending: 3,
      approved: 5,
      flagged: 2,
      complianceRate: 0.7,
    });
    const { GET } = await import('@/app/api/admin/nvc-evaluations/stats/route');

    const req = new NextRequest('http://localhost/api/admin/nvc-evaluations/stats');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.total).toBe(10);
    expect(mockGetNVCEvaluationStats).toHaveBeenCalledWith('tenant_1');
  });
});
