import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockAuditLogFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: { findMany: mockAuditLogFindMany },
  },
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const routeContext = { params: Promise.resolve({}) };

const schoolAdmin = {
  id: 'user_school_admin',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

const mockLogs = [
  {
    id: 'log_3',
    tenantId: 'tenant_1',
    userId: 'user_1',
    action: 'UPDATE_GRADE',
    resource: 'grade',
    timestamp: new Date('2026-03-09T12:00:00Z'),
    metadata: {},
  },
  {
    id: 'log_2',
    tenantId: 'tenant_1',
    userId: 'user_2',
    action: 'CREATE_ASSIGNMENT',
    resource: 'assignment',
    timestamp: new Date('2026-03-09T11:00:00Z'),
    metadata: {},
  },
  {
    id: 'log_1',
    tenantId: 'tenant_1',
    userId: 'user_1',
    action: 'LOGIN',
    resource: 'session',
    timestamp: new Date('2026-03-09T10:00:00Z'),
    metadata: {},
  },
];

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────

describe('GET /api/admin/audit-log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError('Insufficient role'));

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns audit logs for SCHOOL_ADMIN scoped to their tenant', async () => {
    mockRequireRole.mockResolvedValue(schoolAdmin);
    mockAuditLogFindMany.mockResolvedValue(mockLogs);

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant_1' }),
        orderBy: { timestamp: 'desc' },
      }),
    );
  });

  it('filters by action query param when provided', async () => {
    mockRequireRole.mockResolvedValue(schoolAdmin);
    const filteredLogs = mockLogs.filter((l) => l.action.includes('GRADE'));
    mockAuditLogFindMany.mockResolvedValue(filteredLogs);

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log?action=GRADE');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant_1',
          action: { contains: 'GRADE' },
        }),
      }),
    );
  });

  it('filters by resource query param when provided', async () => {
    mockRequireRole.mockResolvedValue(schoolAdmin);
    const filteredLogs = mockLogs.filter((l) => l.resource === 'assignment');
    mockAuditLogFindMany.mockResolvedValue(filteredLogs);

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log?resource=assignment');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant_1',
          resource: { contains: 'assignment' },
        }),
      }),
    );
  });

  it('returns logs ordered by timestamp descending (most recent first)', async () => {
    mockRequireRole.mockResolvedValue(schoolAdmin);
    mockAuditLogFindMany.mockResolvedValue(mockLogs);

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { timestamp: 'desc' },
      }),
    );

    const body = await res.json();
    // Verify the returned order matches the mocked order (most recent first)
    expect(body.data[0].id).toBe('log_3');
    expect(body.data[2].id).toBe('log_1');
  });

  it('returns an empty array when no audit logs exist for the tenant', async () => {
    mockRequireRole.mockResolvedValue(schoolAdmin);
    mockAuditLogFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/audit-log/route');
    const req = new NextRequest('http://localhost/api/admin/audit-log');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});
