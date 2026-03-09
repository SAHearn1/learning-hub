import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    grade: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    evaluationCase: {
      findMany: vi.fn(),
    },
    iepGoal: {
      findMany: vi.fn(),
    },
    disciplineCase: {
      findMany: vi.fn(),
    },
    student: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/safeguards/school-year', () => ({
  getCurrentSchoolYear: vi.fn(() => '2025-2026'),
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

const educatorUser = {
  id: 'user_educator',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

const districtAdminUser = {
  id: 'user_district',
  tenantId: 'tenant_1',
  role: 'DISTRICT_ADMIN',
};

// ─── GET /api/export ──────────────────────────────────────────────────────────

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=grades&format=csv');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=grades&format=csv');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when format is not csv', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=grades&format=json');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/CSV/i);
  });

  it('returns 400 for an unknown export type', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=unknown&format=csv');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('exports grades as CSV with correct headers', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.grade.findMany).mockResolvedValue([
      {
        id: 'grade_1',
        score: 90,
        maxScore: 100,
        percentage: 90,
        letterGrade: 'A',
        gradedAt: new Date('2025-01-15'),
        submission: {
          student: { id: 'student_1' },
          assignment: { title: 'Quiz 1', type: 'QUIZ' },
        },
      },
    ] as any);

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=grades&format=csv');
    const res = await GET(req, routeContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('grades-export.csv');

    const text = await res.text();
    expect(text).toContain('Student ID,Assignment,Type,Score');
    expect(text).toContain('student_1');
  });

  it('exports audit-log as CSV with correct columns', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.auditLog.findMany).mockResolvedValue([
      {
        timestamp: new Date('2025-03-01'),
        userId: 'user_educator',
        action: 'VIEW',
        resource: 'grade',
        resourceId: 'grade_1',
        chainHash: 'abc123',
      },
    ] as any);

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=audit-log&format=csv');
    const res = await GET(req, routeContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('audit-log-export.csv');

    const text = await res.text();
    expect(text).toContain('Timestamp,User ID,Action');
    expect(text).toContain('user_educator');
  });

  it('exports compliance data as CSV covering evaluation, IEP, and discipline rows', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.evaluationCase.findMany).mockResolvedValue([
      { id: 'eval_1', studentId: 's1', currentState: 'OPEN', createdAt: new Date('2025-01-01') },
    ] as any);
    vi.mocked(db.iepGoal.findMany).mockResolvedValue([
      { id: 'goal_1', studentId: 's1', status: 'ACTIVE', createdAt: new Date('2025-02-01') },
    ] as any);
    vi.mocked(db.disciplineCase.findMany).mockResolvedValue([
      { id: 'disc_1', studentId: 's1', currentState: 'OPEN', createdAt: new Date('2025-03-01') },
    ] as any);

    const { GET } = await import('@/app/api/export/route');
    const req = new NextRequest('http://localhost/api/export?type=compliance&format=csv');
    const res = await GET(req, routeContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('compliance-export.csv');

    const text = await res.text();
    expect(text).toContain('Evaluation');
    expect(text).toContain('IEP Goal');
    expect(text).toContain('Discipline');
  });
});

// ─── GET /api/export/state-report ────────────────────────────────────────────

describe('GET /api/export/state-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/export/state-report/route');
    const req = new NextRequest('http://localhost/api/export/state-report');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for SCHOOL_ADMIN role (requires DISTRICT_ADMIN or higher)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());

    const { GET } = await import('@/app/api/export/state-report/route');
    const req = new NextRequest('http://localhost/api/export/state-report');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('generates SPP/APR state report CSV for district admin', async () => {
    mockRequireRole.mockResolvedValue(districtAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.evaluationCase.findMany).mockResolvedValue([
      {
        id: 'eval_1',
        caseType: 'INITIAL',
        evaluationDueDate: new Date('2025-06-01'),
        eligibilityDate: new Date('2025-05-15'),
        studentId: 's1',
      },
      {
        id: 'eval_2',
        caseType: 'INITIAL',
        evaluationDueDate: new Date('2025-06-01'),
        eligibilityDate: new Date('2025-06-15'), // late
        studentId: 's2',
      },
    ] as any);

    vi.mocked(db.disciplineCase.findMany).mockResolvedValue([
      { id: 'disc_1', studentId: 's1', isChangeOfPlacement: false },
    ] as any);

    vi.mocked(db.iepGoal.findMany).mockResolvedValue([
      { id: 'goal_1', status: 'ACTIVE', measurementMethod: 'observation', studentId: 's1' },
      { id: 'goal_2', status: 'ACTIVE', measurementMethod: null, studentId: 's2' },
      { id: 'goal_3', status: 'CLOSED', measurementMethod: null, studentId: 's3' },
    ] as any);

    vi.mocked(db.student.count).mockResolvedValue(50);

    const { GET } = await import('@/app/api/export/state-report/route');
    const req = new NextRequest('http://localhost/api/export/state-report');
    const res = await GET(req, routeContext);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('spp-apr-report-');

    const text = await res.text();
    expect(text).toContain('11,Initial Evaluations');
    expect(text).toContain('Timely');
    expect(text).toContain('Discipline');
    expect(text).toContain('IEP Goals');
  });

  it('computes 100% timely rate when no initial evaluations exist', async () => {
    mockRequireRole.mockResolvedValue(districtAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.evaluationCase.findMany).mockResolvedValue([] as any);
    vi.mocked(db.disciplineCase.findMany).mockResolvedValue([] as any);
    vi.mocked(db.iepGoal.findMany).mockResolvedValue([] as any);
    vi.mocked(db.student.count).mockResolvedValue(0);

    const { GET } = await import('@/app/api/export/state-report/route');
    const req = new NextRequest('http://localhost/api/export/state-report');
    const res = await GET(req, routeContext);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('100');
  });
});
