import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockGetCasesForStudent = vi.fn();
const mockCreateCase = vi.fn();
const mockGetCase = vi.fn();
const mockRecordConsent = vi.fn();
const mockRecordEligibilityDecision = vi.fn();
const mockGetComplianceMetrics = vi.fn();
const mockRecordAssessment = vi.fn();
const mockCreateAssignment = vi.fn();
const mockCreateEvaluationPlan = vi.fn();
const mockTransitionCase = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/evaluation/evaluation.service', () => ({
  getCasesForStudent: mockGetCasesForStudent,
  createCase: mockCreateCase,
  getCase: mockGetCase,
  recordConsent: mockRecordConsent,
  recordEligibilityDecision: mockRecordEligibilityDecision,
  getComplianceMetrics: mockGetComplianceMetrics,
  recordAssessment: mockRecordAssessment,
  createAssignment: mockCreateAssignment,
  createEvaluationPlan: mockCreateEvaluationPlan,
  transitionCase: mockTransitionCase,
}));

vi.mock('@/lib/db', () => ({
  db: {
    evaluationCase: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    evaluationPlan: { findUnique: vi.fn() },
    evalStateTransition: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/monitoring', () => ({
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const routeContext = {
  params: Promise.resolve({ caseId: 'case_1' }),
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

const parentUser = {
  id: 'user_parent',
  tenantId: 'tenant_1',
  role: 'PARENT',
};

const schoolAdminUser = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
};

const mockEvalCase = {
  id: 'case_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  caseType: 'INITIAL',
  status: 'OPEN',
  stateCode: 'CA',
  referralSource: 'Teacher',
  referralReason: 'Academic struggles',
  createdBy: 'user_edu',
  createdAt: new Date().toISOString(),
};

// ─── GET /api/evaluation/cases ───────────────────────────────────────────────

describe('GET /api/evaluation/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role (not allowed on list endpoint)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentId query param is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/studentId/i);
  });

  it('returns 200 with list of cases for valid educator request', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCasesForStudent.mockResolvedValue([mockEvalCase]);
    const { GET } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('case_1');
  });

  it('returns empty array when student has no cases', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCasesForStudent.mockResolvedValue([]);
    const { GET } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases?studentId=stu_no_cases');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ─── POST /api/evaluation/cases ──────────────────────────────────────────────

describe('POST /api/evaluation/cases', () => {
  const validBody = {
    studentId: 'stu_1',
    caseType: 'INITIAL',
    stateCode: 'CA',
    referralSource: 'Teacher',
    referralReason: 'Academic struggles',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when caseType is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, caseType: 'INVALID_TYPE' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when studentId is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases', {
      method: 'POST',
      body: JSON.stringify({ caseType: 'INITIAL' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates a case for educator', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockCreateCase.mockResolvedValue(mockEvalCase);
    const { POST } = await import('@/app/api/evaluation/cases/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('case_1');
    expect(body.data.caseType).toBe('INITIAL');
    expect(mockCreateCase).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        studentId: 'stu_1',
        caseType: 'INITIAL',
        createdBy: 'user_edu',
      }),
    );
  });

  it('accepts all valid caseType values', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    for (const caseType of ['INITIAL', 'REEVALUATION', 'DISMISSAL'] as const) {
      mockCreateCase.mockResolvedValue({ ...mockEvalCase, caseType });
      const { POST } = await import('@/app/api/evaluation/cases/route');

      const req = new NextRequest('http://localhost/api/evaluation/cases', {
        method: 'POST',
        body: JSON.stringify({ studentId: 'stu_1', caseType }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
    }
  });
});

// ─── GET /api/evaluation/cases/[caseId] ──────────────────────────────────────

describe('GET /api/evaluation/cases/[caseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 200 with case detail for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCase.mockResolvedValue(mockEvalCase);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('case_1');
  });

  it('returns 200 with case detail for PARENT (read access)', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    mockGetCase.mockResolvedValue(mockEvalCase);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('case_1');
  });

  it('propagates service errors (e.g. 404) when case is not found', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { NotFoundError } = await import('@/lib/api-errors');
    mockGetCase.mockRejectedValue(new NotFoundError('Case not found'));
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ caseId: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/evaluation/cases/[caseId]/assessments ─────────────────────────

describe('POST /api/evaluation/cases/[caseId]/assessments', () => {
  const validBody = {
    domain: 'ACADEMIC_ACHIEVEMENT',
    instrumentName: 'Woodcock-Johnson IV',
    administeredDate: '2026-02-10',
    results: { standardScore: 85, percentileRank: 16 },
    narrative: 'Student scored below average in reading fluency.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assessments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assessments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role (cannot record assessments)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assessments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assessments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when domain is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assessments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assessments', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, domain: 'INVALID_DOMAIN' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when instrumentName is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assessments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assessments', {
      method: 'POST',
      body: JSON.stringify({ domain: 'COGNITIVE', administeredDate: '2026-02-10', results: {} }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 201 with recorded assessment for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockAssessmentRecord = {
      id: 'assessment_1',
      caseId: 'case_1',
      domain: 'ACADEMIC_ACHIEVEMENT',
      instrumentName: 'Woodcock-Johnson IV',
      administeredBy: 'user_edu',
      administeredDate: '2026-02-10',
      results: { standardScore: 85, percentileRank: 16 },
      narrative: 'Student scored below average in reading fluency.',
    };
    mockRecordAssessment.mockResolvedValue(mockAssessmentRecord);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assessments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assessments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('assessment_1');
    expect(body.data.domain).toBe('ACADEMIC_ACHIEVEMENT');
    expect(mockRecordAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_1',
        domain: 'ACADEMIC_ACHIEVEMENT',
        instrumentName: 'Woodcock-Johnson IV',
        administeredBy: 'user_edu',
      }),
    );
  });

  it('accepts optional assignmentId when provided', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockRecord = { id: 'assessment_2', caseId: 'case_1', assignmentId: 'assign_1', domain: 'COGNITIVE' };
    mockRecordAssessment.mockResolvedValue(mockRecord);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assessments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assessments', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, assignmentId: 'assign_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    expect(mockRecordAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: 'assign_1' }),
    );
  });
});

// ─── POST /api/evaluation/cases/[caseId]/assignments ─────────────────────────

describe('POST /api/evaluation/cases/[caseId]/assignments', () => {
  const validBody = {
    assessorId: 'user_assessor',
    domain: 'COGNITIVE',
    dueDate: '2026-03-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assignments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assignments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role (cannot create assignments)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assignments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assignments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when domain is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assignments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assignments', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, domain: 'INVALID_DOMAIN' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when assessorId is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assignments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assignments', {
      method: 'POST',
      body: JSON.stringify({ domain: 'COGNITIVE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 201 with created assignment for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockAssignment = {
      id: 'assign_1',
      caseId: 'case_1',
      assessorId: 'user_assessor',
      domain: 'COGNITIVE',
      dueDate: '2026-03-01',
      createdBy: 'user_edu',
    };
    mockCreateAssignment.mockResolvedValue(mockAssignment);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assignments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assignments', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('assign_1');
    expect(body.data.domain).toBe('COGNITIVE');
    expect(mockCreateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_1',
        assessorId: 'user_assessor',
        domain: 'COGNITIVE',
        createdBy: 'user_edu',
      }),
    );
  });

  it('accepts optional dueDate', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const mockAssignment = { id: 'assign_2', caseId: 'case_1', assessorId: 'user_assessor', domain: 'MOTOR' };
    mockCreateAssignment.mockResolvedValue(mockAssignment);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/assignments/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/assignments', {
      method: 'POST',
      body: JSON.stringify({ assessorId: 'user_assessor', domain: 'MOTOR' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
  });
});

// ─── GET /api/evaluation/cases/[caseId]/plan ─────────────────────────────────

describe('GET /api/evaluation/cases/[caseId]/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 200 with plan for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    const mockPlan = {
      id: 'plan_1',
      caseId: 'case_1',
      assessmentDomains: ['ACADEMIC_ACHIEVEMENT', 'COGNITIVE'],
      planContent: 'Assessment plan details here.',
      createdBy: 'user_edu',
    };
    (db.evaluationPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlan);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('plan_1');
    expect(body.data.caseId).toBe('case_1');
  });

  it('returns 200 with null data when no plan exists', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.evaluationPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it('returns 200 with plan for PARENT (read access)', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const { db } = await import('@/lib/db');
    const mockPlan = { id: 'plan_1', caseId: 'case_1', planContent: 'Plan content.' };
    (db.evaluationPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlan);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/evaluation/cases/[caseId]/plan ────────────────────────────────

describe('POST /api/evaluation/cases/[caseId]/plan', () => {
  const validBody = {
    assessmentDomains: ['ACADEMIC_ACHIEVEMENT', 'COGNITIVE'],
    planContent: 'We will assess reading, math, and cognitive processing.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role (cannot create plan)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when assessmentDomains is empty', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, assessmentDomains: [] }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when assessmentDomains contains an invalid domain', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, assessmentDomains: ['INVALID_DOMAIN'] }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when planContent is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan', {
      method: 'POST',
      body: JSON.stringify({ assessmentDomains: ['COGNITIVE'] }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 201 with created plan for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockPlan = {
      id: 'plan_1',
      caseId: 'case_1',
      assessmentDomains: ['ACADEMIC_ACHIEVEMENT', 'COGNITIVE'],
      planContent: 'We will assess reading, math, and cognitive processing.',
      createdBy: 'user_edu',
    };
    mockCreateEvaluationPlan.mockResolvedValue(mockPlan);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/plan/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/plan', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('plan_1');
    expect(body.data.assessmentDomains).toContain('COGNITIVE');
    expect(mockCreateEvaluationPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_1',
        createdBy: 'user_edu',
        planContent: 'We will assess reading, math, and cognitive processing.',
      }),
    );
  });
});

// ─── GET /api/evaluation/cases/[caseId]/timeline ─────────────────────────────

describe('GET /api/evaluation/cases/[caseId]/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/timeline/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/timeline');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/timeline/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/timeline');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 200 with ordered transitions for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    const mockTransitions = [
      { id: 'trans_1', caseId: 'case_1', fromState: null, toState: 'EVAL_TRIGGERED', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'trans_2', caseId: 'case_1', fromState: 'EVAL_TRIGGERED', toState: 'CONSENT_REQUESTED', createdAt: '2026-01-05T00:00:00Z' },
    ];
    (db.evalStateTransition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransitions);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/timeline/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/timeline');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].toState).toBe('EVAL_TRIGGERED');
    expect(body.data[1].toState).toBe('CONSENT_REQUESTED');
  });

  it('returns 200 with empty array when no transitions exist', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.evalStateTransition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/timeline/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/timeline');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('returns 200 with timeline for PARENT (read access)', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const { db } = await import('@/lib/db');
    const mockTransitions = [
      { id: 'trans_1', caseId: 'case_1', toState: 'EVAL_TRIGGERED', createdAt: '2026-01-01T00:00:00Z' },
    ];
    (db.evalStateTransition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransitions);
    const { GET } = await import('@/app/api/evaluation/cases/[caseId]/timeline/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/timeline');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

// ─── POST /api/evaluation/cases/[caseId]/transition ──────────────────────────

describe('POST /api/evaluation/cases/[caseId]/transition', () => {
  const validBody = {
    toState: 'CONSENT_REQUESTED',
    reason: 'Parental notification sent',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/transition/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/transition', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role (cannot trigger transitions)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/transition/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/transition', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when toState is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/transition/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/transition', {
      method: 'POST',
      body: JSON.stringify({ toState: 'INVALID_STATE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 200 with successful transition result for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockResult = {
      success: true,
      caseId: 'case_1',
      fromState: 'EVAL_TRIGGERED',
      toState: 'CONSENT_REQUESTED',
      transitionedAt: '2026-02-15T10:00:00Z',
    };
    mockTransitionCase.mockResolvedValue(mockResult);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/transition/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/transition', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
    expect(body.data.toState).toBe('CONSENT_REQUESTED');
    expect(mockTransitionCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_1',
        toState: 'CONSENT_REQUESTED',
        userId: 'user_edu',
      }),
    );
  });

  it('returns 422 when transition is not permitted from current state', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockResult = {
      success: false,
      reason: 'Cannot transition from CLOSED to CONSENT_REQUESTED',
    };
    mockTransitionCase.mockResolvedValue(mockResult);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/transition/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/transition', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.data.success).toBe(false);
  });

  it('accepts transition without optional reason field', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const mockResult = { success: true, toState: 'SAFEGUARDS_ISSUED' };
    mockTransitionCase.mockResolvedValue(mockResult);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/transition/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/transition', {
      method: 'POST',
      body: JSON.stringify({ toState: 'SAFEGUARDS_ISSUED' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/evaluation/cases/[caseId]/consent ─────────────────────────────

describe('POST /api/evaluation/cases/[caseId]/consent', () => {
  const validBody = {
    consentType: 'INITIAL_EVALUATION',
    decision: 'GRANTED',
    respondentName: 'Jane Parent',
    consentDate: '2026-01-15',
    notes: 'Signed at in-person meeting',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/consent/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/consent', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role (only PARENT may record consent)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/consent/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/consent', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when consentType is invalid', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/consent/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/consent', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, consentType: 'INVALID_TYPE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when decision is invalid', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/consent/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/consent', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, decision: 'PENDING' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when respondentName is missing', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/consent/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/consent', {
      method: 'POST',
      body: JSON.stringify({ consentType: 'INITIAL_EVALUATION', decision: 'GRANTED', consentDate: '2026-01-15' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 201 with recorded consent for PARENT', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const mockConsent = {
      id: 'consent_1',
      caseId: 'case_1',
      consentType: 'INITIAL_EVALUATION',
      decision: 'GRANTED',
      respondentId: 'user_parent',
      respondentName: 'Jane Parent',
      consentDate: '2026-01-15',
    };
    mockRecordConsent.mockResolvedValue(mockConsent);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/consent/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/consent', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('consent_1');
    expect(body.data.decision).toBe('GRANTED');
    expect(mockRecordConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_1',
        consentType: 'INITIAL_EVALUATION',
        decision: 'GRANTED',
        respondentId: 'user_parent',
      }),
    );
  });
});

// ─── POST /api/evaluation/cases/[caseId]/eligibility ─────────────────────────

describe('POST /api/evaluation/cases/[caseId]/eligibility', () => {
  const validBody = {
    outcome: 'ELIGIBLE',
    disabilityCategory: 'Specific Learning Disability',
    rationale: 'Student meets criteria in reading and math',
    decisionDate: '2026-02-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/eligibility/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/eligibility', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role (cannot record eligibility decisions)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/eligibility/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/eligibility', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when outcome is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/eligibility/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/eligibility', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, outcome: 'UNKNOWN' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when rationale is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/eligibility/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/eligibility', {
      method: 'POST',
      body: JSON.stringify({ outcome: 'ELIGIBLE', decisionDate: '2026-02-01' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 201 with decision and content for valid request', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockDecision = { id: 'dec_1', caseId: 'case_1', outcome: 'ELIGIBLE' };
    const mockContent = { summary: 'Student is eligible for special education services.' };
    mockRecordEligibilityDecision.mockResolvedValue({ decision: mockDecision, content: mockContent });
    const { POST } = await import('@/app/api/evaluation/cases/[caseId]/eligibility/route');

    const req = new NextRequest('http://localhost/api/evaluation/cases/case_1/eligibility', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.decision.id).toBe('dec_1');
    expect(body.data.content).toBeDefined();
    expect(mockRecordEligibilityDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case_1',
        outcome: 'ELIGIBLE',
        decidedBy: 'user_edu',
      }),
    );
  });
});

// ─── GET /api/evaluation/compliance ──────────────────────────────────────────

describe('GET /api/evaluation/compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/evaluation/compliance/route');

    const req = new NextRequest('http://localhost/api/evaluation/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role (not allowed on compliance metrics)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/compliance/route');

    const req = new NextRequest('http://localhost/api/evaluation/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/evaluation/compliance/route');

    const req = new NextRequest('http://localhost/api/evaluation/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 200 with compliance metrics for SCHOOL_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const mockMetrics = {
      totalCases: 10,
      openCases: 3,
      overdueTimelines: 1,
      consentsPending: 2,
      eligibilityDecisionsDue: 1,
    };
    mockGetComplianceMetrics.mockResolvedValue(mockMetrics);
    const { GET } = await import('@/app/api/evaluation/compliance/route');

    const req = new NextRequest('http://localhost/api/evaluation/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalCases).toBe(10);
    expect(body.data.overdueTimelines).toBe(1);
    expect(mockGetComplianceMetrics).toHaveBeenCalledWith('tenant_1');
  });
});
