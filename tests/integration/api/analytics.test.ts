import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({ requireRole: mockRequireRole, requireUser: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { count: vi.fn() },
    user: { count: vi.fn() },
    class: { count: vi.fn() },
    session: { count: vi.fn() },
    assessment: { count: vi.fn() },
    iepGoal: { count: vi.fn() },
    evaluationCase: { count: vi.fn() },
    disciplineCase: { count: vi.fn() },
    aiSuggestionReview: { count: vi.fn() },
    tenant: { findMany: vi.fn() },
  },
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

const routeContext = { params: Promise.resolve({}) };

// ─── shared mock helpers ──────────────────────────────────────────────────────

async function getDb() {
  const { db } = await import('@/lib/db');
  return db;
}

function mockSchoolCounts(db: Awaited<ReturnType<typeof getDb>>, overrides: Partial<{
  students: number;
  educators: number;
  classes: number;
  totalSessions: number;
  activeSessions: number;
  assessments: number;
  totalGoals: number;
  activeGoals: number;
  openEvals: number;
  totalEvals: number;
  openDiscipline: number;
  consentGranted: number;
  pendingReviews: number;
}> = {}) {
  const defaults = {
    students: 50,
    educators: 10,
    classes: 8,
    totalSessions: 200,
    activeSessions: 5,
    assessments: 120,
    totalGoals: 30,
    activeGoals: 20,
    openEvals: 3,
    totalEvals: 10,
    openDiscipline: 2,
    consentGranted: 45,
    pendingReviews: 4,
    ...overrides,
  };

  // Each Promise.all slot maps to a specific call — use mockResolvedValueOnce chain
  vi.mocked(db.student.count).mockResolvedValue(defaults.students);
  vi.mocked(db.user.count)
    .mockResolvedValueOnce(defaults.educators)    // EDUCATOR count
    .mockResolvedValueOnce(defaults.consentGranted); // STUDENT+GRANTED count
  vi.mocked(db.class.count).mockResolvedValue(defaults.classes);
  vi.mocked(db.session.count)
    .mockResolvedValueOnce(defaults.totalSessions)
    .mockResolvedValueOnce(defaults.activeSessions);
  vi.mocked(db.assessment.count).mockResolvedValue(defaults.assessments);
  vi.mocked(db.iepGoal.count)
    .mockResolvedValueOnce(defaults.totalGoals)
    .mockResolvedValueOnce(defaults.activeGoals);
  vi.mocked(db.evaluationCase.count)
    .mockResolvedValueOnce(defaults.openEvals)
    .mockResolvedValueOnce(defaults.totalEvals);
  vi.mocked(db.disciplineCase.count).mockResolvedValue(defaults.openDiscipline);
  vi.mocked(db.aiSuggestionReview.count).mockResolvedValue(defaults.pendingReviews);
}

// ─── school analytics ─────────────────────────────────────────────────────────

describe('GET /api/analytics/school', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns analytics object with expected shape for SCHOOL_ADMIN', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' });
    const db = await getDb();
    mockSchoolCounts(db);
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toMatchObject({
      students: expect.objectContaining({ total: expect.any(Number), consentGranted: expect.any(Number), complianceRate: expect.any(Number) }),
      educators: expect.objectContaining({ total: expect.any(Number) }),
      classes: expect.objectContaining({ total: expect.any(Number) }),
      sessions: expect.objectContaining({ total: expect.any(Number), active: expect.any(Number) }),
      assessments: expect.objectContaining({ total: expect.any(Number) }),
      iepGoals: expect.objectContaining({ total: expect.any(Number), active: expect.any(Number) }),
      evaluations: expect.objectContaining({ open: expect.any(Number), total: expect.any(Number) }),
      discipline: expect.objectContaining({ open: expect.any(Number) }),
      pendingReviews: expect.any(Number),
    });
  });

  it('returns complianceRate as integer 0–100', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' });
    const db = await getDb();
    mockSchoolCounts(db, { students: 100, consentGranted: 73 });
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    const rate = body.data.students.complianceRate;
    expect(Number.isInteger(rate)).toBe(true);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
    expect(rate).toBe(73);
  });

  it('returns pendingReviews count', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' });
    const db = await getDb();
    mockSchoolCounts(db, { pendingReviews: 7 });
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.pendingReviews).toBe(7);
  });

  it('returns sessions.active count', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' });
    const db = await getDb();
    mockSchoolCounts(db, { totalSessions: 300, activeSessions: 12 });
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.sessions.total).toBe(300);
    expect(body.data.sessions.active).toBe(12);
  });

  it('returns evaluations.open count', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' });
    const db = await getDb();
    mockSchoolCounts(db, { openEvals: 6, totalEvals: 15 });
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.evaluations.open).toBe(6);
    expect(body.data.evaluations.total).toBe(15);
  });

  it('returns complianceRate 100 when no students', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' });
    const db = await getDb();
    mockSchoolCounts(db, { students: 0, consentGranted: 0 });
    const { GET } = await import('@/app/api/analytics/school/route');

    const req = new NextRequest('http://localhost/api/analytics/school');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.students.complianceRate).toBe(100);
  });
});

// ─── district analytics ───────────────────────────────────────────────────────

describe('GET /api/analytics/district', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for SCHOOL_ADMIN role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns district data for DISTRICT_ADMIN', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'DISTRICT_ADMIN' });
    const db = await getDb();
    vi.mocked(db.tenant.findMany).mockResolvedValue([
      { id: 'tenant_1', name: 'Lincoln High', subscriptionTier: 'PROFESSIONAL', _count: { users: 120 } } as never,
    ]);
    vi.mocked(db.session.count).mockResolvedValue(500);
    vi.mocked(db.iepGoal.count).mockResolvedValue(40);
    vi.mocked(db.evaluationCase.count).mockResolvedValue(8);
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveProperty('schools');
    expect(body.data).toHaveProperty('district');
  });

  it('PLATFORM_ADMIN can pass tenantId query param', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u_admin', tenantId: 'tenant_admin', role: 'PLATFORM_ADMIN' });
    const db = await getDb();
    vi.mocked(db.tenant.findMany).mockResolvedValue([
      { id: 'tenant_other', name: 'Other School', subscriptionTier: 'STARTER', _count: { users: 50 } } as never,
    ]);
    vi.mocked(db.session.count).mockResolvedValue(100);
    vi.mocked(db.iepGoal.count).mockResolvedValue(10);
    vi.mocked(db.evaluationCase.count).mockResolvedValue(2);
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district?tenantId=tenant_other');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    // Verify tenantId was used in the query
    expect(vi.mocked(db.tenant.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tenant_other' } }),
    );
  });

  it('returns schools array', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'DISTRICT_ADMIN' });
    const db = await getDb();
    const mockSchools = [
      { id: 'tenant_1', name: 'School A', subscriptionTier: 'PROFESSIONAL', _count: { users: 80 } },
    ];
    vi.mocked(db.tenant.findMany).mockResolvedValue(mockSchools as never);
    vi.mocked(db.session.count).mockResolvedValue(200);
    vi.mocked(db.iepGoal.count).mockResolvedValue(15);
    vi.mocked(db.evaluationCase.count).mockResolvedValue(3);
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data.schools)).toBe(true);
    expect(body.data.schools).toHaveLength(1);
    expect(body.data.schools[0].name).toBe('School A');
  });

  it('returns district.totalSessions', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'DISTRICT_ADMIN' });
    const db = await getDb();
    vi.mocked(db.tenant.findMany).mockResolvedValue([] as never);
    vi.mocked(db.session.count).mockResolvedValue(750);
    vi.mocked(db.iepGoal.count).mockResolvedValue(25);
    vi.mocked(db.evaluationCase.count).mockResolvedValue(5);
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.district.totalSessions).toBe(750);
  });

  it('returns district.openEvaluations', async () => {
    mockRequireRole.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'DISTRICT_ADMIN' });
    const db = await getDb();
    vi.mocked(db.tenant.findMany).mockResolvedValue([] as never);
    vi.mocked(db.session.count).mockResolvedValue(100);
    vi.mocked(db.iepGoal.count).mockResolvedValue(5);
    vi.mocked(db.evaluationCase.count).mockResolvedValue(9);
    const { GET } = await import('@/app/api/analytics/district/route');

    const req = new NextRequest('http://localhost/api/analytics/district');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.district.openEvaluations).toBe(9);
  });
});
