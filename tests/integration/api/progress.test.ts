import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Auth mock ---
const mockRequireUser = vi.fn();

// --- DB mocks ---
const mockStudentFindUnique = vi.fn();
const mockProgressFindMany = vi.fn();
const mockReasoningMoveFindMany = vi.fn();
const mockSessionFindMany = vi.fn();
const mockStandardFindUnique = vi.fn();
const mockProgressFindUnique = vi.fn();
const mockAssessmentFindMany = vi.fn();
const mockStandardFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { findUnique: mockStudentFindUnique },
    progress: { findMany: mockProgressFindMany, findUnique: mockProgressFindUnique },
    reasoningMoveProgress: { findMany: mockReasoningMoveFindMany },
    session: { findMany: mockSessionFindMany },
    standard: { findUnique: mockStandardFindUnique, findMany: mockStandardFindMany },
    assessment: { findMany: mockAssessmentFindMany },
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

const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  student: { id: 'stu_1' },
};
const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
  student: null,
};
const parentUser = {
  id: 'user_par',
  tenantId: 'tenant_1',
  role: 'PARENT',
  parent: { id: 'par_1', childrenIds: ['user_stu_child'] },
  student: null,
};

// ---------------------------------------------------------------------------
// GET /api/progress
// ---------------------------------------------------------------------------
describe('GET /api/progress', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 404 when STUDENT has no student profile', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, student: null });
    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-student role without studentId', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 403 when educator queries student from different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_other',
      user: { tenantId: 'tenant_other' },
    });
    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress?studentId=stu_other');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns progress data for authenticated student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockProgressFindMany.mockResolvedValue([
      { id: 'prog_1', masteryLevel: 85, standardId: 'std_1', updatedAt: new Date(), standard: { code: 'M.1' } },
      { id: 'prog_2', masteryLevel: 50, standardId: 'std_2', updatedAt: new Date(), standard: { code: 'M.2' } },
    ]);
    mockReasoningMoveFindMany.mockResolvedValue([]);
    mockSessionFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary.totalStandards).toBe(2);
    expect(body.data.summary.masteredCount).toBe(1);
    expect(body.data.summary.inProgressCount).toBe(1);
    expect(body.data.standards).toHaveLength(2);
  });

  it('returns progress for educator querying student in same tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_1',
      user: { tenantId: 'tenant_1' },
    });
    mockProgressFindMany.mockResolvedValue([]);
    mockReasoningMoveFindMany.mockResolvedValue([]);
    mockSessionFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary.totalStandards).toBe(0);
  });

  it('returns zero average mastery when no progress entries exist', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockProgressFindMany.mockResolvedValue([]);
    mockReasoningMoveFindMany.mockResolvedValue([]);
    mockSessionFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/progress/route');
    const req = new NextRequest('http://localhost/api/progress');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary.averageMastery).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/progress/standards/[standardId]
// ---------------------------------------------------------------------------
describe('GET /api/progress/standards/[standardId]', () => {
  const standardsRouteContext = { params: Promise.resolve({ standardId: 'std_1' }) };

  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress/standards/[standardId]/route');
    const req = new NextRequest('http://localhost/api/progress/standards/std_1');
    const res = await GET(req, standardsRouteContext);
    expect(res.status).toBe(401);
  });

  it('returns 404 when standard not found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStandardFindUnique.mockResolvedValue(null);
    mockAssessmentFindMany.mockResolvedValue([]);
    mockProgressFindUnique.mockResolvedValue(null);
    mockStandardFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/progress/standards/[standardId]/route');
    const req = new NextRequest('http://localhost/api/progress/standards/std_missing');
    const res = await GET(req, { params: Promise.resolve({ standardId: 'std_missing' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when non-student role does not provide studentId', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/progress/standards/[standardId]/route');
    const req = new NextRequest('http://localhost/api/progress/standards/std_1');
    const res = await GET(req, standardsRouteContext);
    expect(res.status).toBe(400);
  });

  it('returns detailed standard progress for authenticated student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const standard = {
      id: 'std_1',
      code: 'M.1.1',
      description: 'Add within 20',
      subject: 'MATH',
      gradeLevel: [1, 2],
      domain: 'OA',
      cluster: 'Operations',
      topics: [{ id: 'top_1', name: 'Addition', learningObjectives: [] }],
    };
    mockStandardFindUnique.mockResolvedValue(standard);
    mockProgressFindUnique.mockResolvedValue({ masteryLevel: 75, assessmentCount: 10, lastAssessedAt: new Date() });
    mockAssessmentFindMany.mockResolvedValue([
      { id: 'a_1', question: 'Q1', isCorrect: true, score: 1, bloomsLevel: 'REMEMBER', difficulty: 2, createdAt: new Date(), type: 'DIAGNOSTIC' },
      { id: 'a_2', question: 'Q2', isCorrect: false, score: 0, bloomsLevel: 'UNDERSTAND', difficulty: 3, createdAt: new Date(), type: 'FORMATIVE' },
    ]);
    mockStandardFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/progress/standards/[standardId]/route');
    const req = new NextRequest('http://localhost/api/progress/standards/std_1');
    const res = await GET(req, standardsRouteContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.standard.code).toBe('M.1.1');
    expect(body.data.progress.masteryLevel).toBe(75);
    expect(body.data.statistics.totalAssessments).toBe(2);
    expect(body.data.statistics.correctCount).toBe(1);
    expect(body.data.statistics.accuracyRate).toBe(50);
    expect(body.data.assessmentHistory).toHaveLength(2);
  });

  it('returns zero mastery when no progress entry exists', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStandardFindUnique.mockResolvedValue({
      id: 'std_1', code: 'M.1.1', description: 'Test', subject: 'MATH',
      gradeLevel: [1], domain: 'OA', cluster: 'Ops', topics: [],
    });
    mockProgressFindUnique.mockResolvedValue(null);
    mockAssessmentFindMany.mockResolvedValue([]);
    mockStandardFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/progress/standards/[standardId]/route');
    const req = new NextRequest('http://localhost/api/progress/standards/std_1');
    const res = await GET(req, standardsRouteContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.progress.masteryLevel).toBe(0);
    expect(body.data.statistics.accuracyRate).toBe(0);
  });
});
