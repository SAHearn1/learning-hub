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
}));

vi.mock('@/lib/db', () => ({
  db: {
    evaluationCase: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
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
