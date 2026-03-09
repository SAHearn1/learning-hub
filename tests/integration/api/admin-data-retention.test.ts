import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockGetStats = vi.fn();
const mockEnforce = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/compliance/data-retention', () => ({
  getRetentionStatistics: mockGetStats,
  enforceDataRetention: mockEnforce,
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

// tenantStorage.run is used by the cron route — run the callback immediately.
vi.mock('@/lib/tenant-context', () => ({
  tenantStorage: {
    run: vi.fn((_store: unknown, fn: () => unknown) => fn()),
  },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const routeContext = { params: Promise.resolve({}) };

const platformAdmin = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'PLATFORM_ADMIN',
};

const mockStatistics = {
  totalSessions: 1200,
  sessionsEligibleForDeletion: 40,
  totalAssessments: 8000,
  assessmentsEligibleForDeletion: 120,
  totalConsentRecords: 500,
  consentRecordsEligibleForDeletion: 0,
  totalAuditLogs: 15000,
  auditLogsEligibleForDeletion: 300,
};

const mockEnforceResult = {
  jobId: 'job_abc123',
  startTime: new Date('2026-03-09T02:00:00Z'),
  endTime: new Date('2026-03-09T02:01:30Z'),
  recordsProcessed: 460,
  recordsDeleted: 460,
  recordsAnonymized: 0,
  errors: [],
  success: true,
};

// ─── GET /api/admin/data-retention ───────────────────────────────────────────

describe('GET /api/admin/data-retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/admin/data-retention/route');
    const req = new NextRequest('http://localhost/api/admin/data-retention');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-PLATFORM_ADMIN roles', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError('Insufficient role'));

    const { GET } = await import('@/app/api/admin/data-retention/route');
    const req = new NextRequest('http://localhost/api/admin/data-retention');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns retention statistics with a timestamp for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockGetStats.mockResolvedValue(mockStatistics);

    const { GET } = await import('@/app/api/admin/data-retention/route');
    const req = new NextRequest('http://localhost/api/admin/data-retention');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.statistics).toEqual(mockStatistics);
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    expect(mockGetStats).toHaveBeenCalledOnce();
  });
});

// ─── POST /api/admin/data-retention ──────────────────────────────────────────

describe('POST /api/admin/data-retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/admin/data-retention/route');
    const req = new NextRequest('http://localhost/api/admin/data-retention', { method: 'POST' });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('triggers enforcement and returns the job result for PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockEnforce.mockResolvedValue(mockEnforceResult);

    const { POST } = await import('@/app/api/admin/data-retention/route');
    const req = new NextRequest('http://localhost/api/admin/data-retention', { method: 'POST' });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result).toEqual(expect.objectContaining({ success: true, jobId: 'job_abc123' }));
    expect(body.message).toContain('completed successfully');
    expect(mockEnforce).toHaveBeenCalledOnce();
  });

  it('returns a partial-failure message when enforcement completes with errors', async () => {
    mockRequireRole.mockResolvedValue(platformAdmin);
    mockEnforce.mockResolvedValue({ ...mockEnforceResult, success: false, errors: ['Failed to delete session xyz'] });

    const { POST } = await import('@/app/api/admin/data-retention/route');
    const req = new NextRequest('http://localhost/api/admin/data-retention', { method: 'POST' });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.result.success).toBe(false);
    expect(body.message).toContain('with errors');
  });
});

// ─── GET /api/cron/data-retention ────────────────────────────────────────────

describe('GET /api/cron/data-retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const { GET } = await import('@/app/api/cron/data-retention/route');
    const req = new NextRequest('http://localhost/api/cron/data-retention');
    const res = await GET(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when the Authorization header contains the wrong secret', async () => {
    const { GET } = await import('@/app/api/cron/data-retention/route');
    const req = new NextRequest('http://localhost/api/cron/data-retention', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with enforcement result when the correct secret is provided', async () => {
    mockEnforce.mockResolvedValue(mockEnforceResult);

    const { GET } = await import('@/app/api/cron/data-retention/route');
    const req = new NextRequest('http://localhost/api/cron/data-retention', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.durationMs).toBe('number');
    expect(mockEnforce).toHaveBeenCalledOnce();
  });

  it('returns 500 when enforcement throws an unexpected error', async () => {
    mockEnforce.mockRejectedValue(new Error('DB connection timeout'));

    const { GET } = await import('@/app/api/cron/data-retention/route');
    const req = new NextRequest('http://localhost/api/cron/data-retention', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('DB connection timeout');
  });
});
