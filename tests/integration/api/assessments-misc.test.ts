import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockRequireRole = vi.fn();
const mockSessionFindFirst = vi.fn();
const mockAssessmentFindMany = vi.fn();
const mockAssessmentFindUnique = vi.fn();
const mockAssessmentUpdate = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/db', () => ({
  db: {
    session: { findFirst: mockSessionFindFirst },
    assessment: {
      findMany: mockAssessmentFindMany,
      findUnique: mockAssessmentFindUnique,
      update: mockAssessmentUpdate,
    },
    rubricReview: { create: vi.fn() },
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

const studentUser = {
  id: 'user_student',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  student: {
    id: 'student_1',
    gradeLevel: 5,
  },
};

const studentUserNoProfile = {
  id: 'user_noprofile',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  student: null,
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

const mockAssessments = [
  {
    id: 'assess_1',
    type: 'FORMATIVE',
    question: 'What is 2+2?',
    score: 85,
    feedback: 'Good work',
    studentResponse: 'Four',
    metadata: {},
    createdAt: new Date('2026-03-01T10:00:00Z'),
    session: {
      tenantId: 'tenant_1',
      student: {
        user: { firstName: 'Alice', lastName: 'Smith' },
      },
    },
  },
];

// ─── GET /api/assessments/context ────────────────────────────────────────────

describe('GET /api/assessments/context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/assessments/context/route');
    const req = new NextRequest('http://localhost/api/assessments/context');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 404 when the authenticated user has no student profile', async () => {
    mockRequireUser.mockResolvedValue(studentUserNoProfile);

    const { GET } = await import('@/app/api/assessments/context/route');
    const req = new NextRequest('http://localhost/api/assessments/context');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns context with studentId, gradeLevel, subject, and sessionId for an active session', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindFirst.mockResolvedValue({
      id: 'session_1',
      studentId: 'student_1',
      subject: 'SCIENCE',
      endedAt: null,
    });

    const { GET } = await import('@/app/api/assessments/context/route');
    const req = new NextRequest('http://localhost/api/assessments/context');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.studentId).toBe('student_1');
    expect(body.data.gradeLevel).toBe(5);
    expect(body.data.subject).toBe('SCIENCE');
    expect(body.data.sessionId).toBe('session_1');
  });

  it('returns null sessionId and defaults subject to MATH when no active session exists', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindFirst.mockResolvedValue(null);

    const { GET } = await import('@/app/api/assessments/context/route');
    const req = new NextRequest('http://localhost/api/assessments/context');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.sessionId).toBeNull();
    expect(body.data.subject).toBe('MATH');
  });
});

// ─── GET /api/assessments/review ─────────────────────────────────────────────

describe('GET /api/assessments/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError('Insufficient role'));

    const { GET } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns a list of assessments pending educator review', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockAssessmentFindMany.mockResolvedValue(mockAssessments);

    const { GET } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('assess_1');
    expect(body.data[0].studentName).toBe('Alice Smith');
    expect(mockAssessmentFindMany).toHaveBeenCalledOnce();
  });

  it('returns an empty array when no assessments are pending review', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockAssessmentFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});

// ─── POST /api/assessments/review ────────────────────────────────────────────

describe('POST /api/assessments/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: 'assess_1', rubricScore: 90, comments: 'Excellent' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { POST } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: 'assess_1' /* missing rubricScore and comments */ }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when rubricScore is out of range', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { POST } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: 'assess_1', rubricScore: 150, comments: 'Too high' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when assessment does not belong to the educators tenant', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockAssessmentFindUnique.mockResolvedValue({
      id: 'assess_other',
      session: { tenantId: 'tenant_other' },
      metadata: {},
    });

    const { POST } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: 'assess_other', rubricScore: 80, comments: 'Good' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('creates a rubric review and returns 200 for a valid educator request', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockAssessmentFindUnique.mockResolvedValue({
      id: 'assess_1',
      session: { tenantId: 'tenant_1' },
      metadata: {},
    });
    const updatedAssessment = {
      id: 'assess_1',
      metadata: {
        educatorReview: {
          reviewerId: 'user_edu',
          rubricScore: 90,
          comments: 'Excellent response',
          reviewedAt: new Date().toISOString(),
        },
      },
    };
    mockAssessmentUpdate.mockResolvedValue(updatedAssessment);

    const { POST } = await import('@/app/api/assessments/review/route');
    const req = new NextRequest('http://localhost/api/assessments/review', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: 'assess_1', rubricScore: 90, comments: 'Excellent response' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBe('assess_1');
    expect(body.message).toBe('Assessment reviewed successfully');
    expect(mockAssessmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'assess_1' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            educatorReview: expect.objectContaining({
              reviewerId: 'user_edu',
              rubricScore: 90,
              comments: 'Excellent response',
            }),
          }),
        }),
      }),
    );
  });
});
