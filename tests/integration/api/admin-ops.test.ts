import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockRequireUser = vi.fn();
const mockIngestLogFindMany = vi.fn();
const mockGetSuperAdminDashboardData = vi.fn();
const mockCreateManualIntervention = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: mockRequireUser,
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    ingestLog: { findMany: mockIngestLogFindMany },
    platformConfig: {
      upsert: vi.fn().mockResolvedValue({ key: 'default', ingestionEnabled: false }),
    },
  },
}));
vi.mock('@/lib/super-admin', () => ({
  getSuperAdminDashboardData: mockGetSuperAdminDashboardData,
  createManualIntervention: mockCreateManualIntervention,
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

const platformAdmin = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'PLATFORM_ADMIN',
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

// ─── GET /api/admin/super/overview ───────────────────────────────────────────

describe('GET /api/admin/super/overview', () => {
  const routeCtx = { params: Promise.resolve({}) };

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/admin/super/overview/route');

    const req = new NextRequest('http://localhost/api/admin/super/overview');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/admin/super/overview/route');

    const req = new NextRequest('http://localhost/api/admin/super/overview');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns dashboard data for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockGetSuperAdminDashboardData.mockResolvedValue({
      tenants: [],
      totalSessions: 0,
      totalTokens: 0,
      monthlyRevenue: 0,
      recentAuditEvents: [],
    });
    const { GET } = await import('@/app/api/admin/super/overview/route');

    const req = new NextRequest('http://localhost/api/admin/super/overview');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenants).toBeDefined();
    expect(mockGetSuperAdminDashboardData).toHaveBeenCalledOnce();
  });
});

// ─── POST /api/admin/super/tenants/[tenantId]/interventions ──────────────────

describe('POST /api/admin/super/tenants/[tenantId]/interventions', () => {
  function routeCtx(tenantId = 'tenant_target') {
    return { params: Promise.resolve({ tenantId }) };
  }

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/interventions/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_target/interventions',
      { method: 'POST', body: JSON.stringify({ summary: 'Test intervention detail here' }) },
    );
    const res = await POST(req, routeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-PLATFORM_ADMIN role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/interventions/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_target/interventions',
      { method: 'POST', body: JSON.stringify({ summary: 'Test intervention detail here' }) },
    );
    const res = await POST(req, routeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid/missing summary', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/interventions/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_target/interventions',
      { method: 'POST', body: JSON.stringify({ summary: 'x' }) }, // too short (< 5 chars)
    );
    const res = await POST(req, routeCtx());
    expect(res.status).toBe(400);
  });

  it('creates intervention and returns ID for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockCreateManualIntervention.mockResolvedValue({
      id: 'interv_1',
      timestamp: new Date().toISOString(),
    });
    const { POST } = await import(
      '@/app/api/admin/super/tenants/[tenantId]/interventions/route'
    );

    const req = new NextRequest(
      'http://localhost/api/admin/super/tenants/tenant_target/interventions',
      {
        method: 'POST',
        body: JSON.stringify({ summary: 'Critical data issue found' }),
      },
    );
    const res = await POST(req, routeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.interventionId).toBe('interv_1');
    expect(body.createdAt).toBeDefined();
    expect(mockCreateManualIntervention).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_target',
        actorUserId: 'user_admin',
        summary: 'Critical data issue found',
      }),
    );
  });
});

// ─── GET /api/admin/ingest-logs ───────────────────────────────────────────────

describe('GET /api/admin/ingest-logs', () => {
  const routeCtx = { params: Promise.resolve({}) };

  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/admin/ingest-logs/route');

    const req = new NextRequest('http://localhost/api/admin/ingest-logs');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/admin/ingest-logs/route');

    const req = new NextRequest('http://localhost/api/admin/ingest-logs');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns paginated log list for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    const logs = [
      {
        id: 'log_1',
        status: 'SUCCESS',
        source: 'WEBHOOK',
        processedFiles: 3,
        timestamp: new Date().toISOString(),
      },
    ];
    mockIngestLogFindMany.mockResolvedValue(logs);
    const { GET } = await import('@/app/api/admin/ingest-logs/route');

    const req = new NextRequest('http://localhost/api/admin/ingest-logs');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].status).toBe('SUCCESS');
    expect(mockIngestLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { timestamp: 'desc' }, take: 100 }),
    );
  });

  it('returns empty logs list when no ingestions have run', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockIngestLogFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/admin/ingest-logs/route');

    const req = new NextRequest('http://localhost/api/admin/ingest-logs');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toEqual([]);
  });
});

// ─── POST /api/admin/trigger-ingest ──────────────────────────────────────────

describe('POST /api/admin/trigger-ingest', () => {
  const routeCtx = { params: Promise.resolve({}) };

  beforeEach(() => {
    vi.clearAllMocks();
    // Replace global fetch with a mock
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/admin/trigger-ingest/route');

    const req = new NextRequest('http://localhost/api/admin/trigger-ingest', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-PLATFORM_ADMIN role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/admin/trigger-ingest/route');

    const req = new NextRequest('http://localhost/api/admin/trigger-ingest', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('forwards to ingest endpoint and returns result for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, processedFiles: 2 }),
    });
    const { POST } = await import('@/app/api/admin/trigger-ingest/route');

    const req = new NextRequest('http://localhost/api/admin/trigger-ingest', {
      method: 'POST',
      body: JSON.stringify({ source: 'MANUAL' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ingest'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
