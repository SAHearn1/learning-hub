import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockGetCasesForStudent = vi.fn();
const mockCreateDisciplineCase = vi.fn();
const mockGetCase = vi.fn();
const mockCloseDisciplineCase = vi.fn();
const mockRecordManifestDetermination = vi.fn();
const mockCheckDisciplineCompliance = vi.fn();
const mockGetDisciplineMetrics = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/discipline/discipline.service', () => ({
  getCasesForStudent: mockGetCasesForStudent,
  createDisciplineCase: mockCreateDisciplineCase,
  getCase: mockGetCase,
  closeDisciplineCase: mockCloseDisciplineCase,
  recordManifestDetermination: mockRecordManifestDetermination,
  checkDisciplineCompliance: mockCheckDisciplineCompliance,
  getDisciplineMetrics: mockGetDisciplineMetrics,
}));

vi.mock('@/lib/db', () => ({
  db: {
    disciplineCase: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
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

const mockDisciplineCase = {
  id: 'case_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  removalType: 'OUT_OF_SCHOOL_SUSPENSION',
  removalStartDate: '2026-01-10',
  removalDays: 3,
  incidentDescription: 'Altercation on playground',
  status: 'OPEN',
  createdBy: 'user_edu',
  createdAt: new Date().toISOString(),
};

// ─── GET /api/discipline/cases ───────────────────────────────────────────────

describe('GET /api/discipline/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentId query param is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/studentId/i);
  });

  it('returns 200 with list of discipline cases', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCasesForStudent.mockResolvedValue([mockDisciplineCase]);
    const { GET } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].removalType).toBe('OUT_OF_SCHOOL_SUSPENSION');
    expect(mockGetCasesForStudent).toHaveBeenCalledWith('tenant_1', 'stu_1');
  });

  it('returns empty array when student has no discipline cases', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    mockGetCasesForStudent.mockResolvedValue([]);
    const { GET } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases?studentId=stu_no_cases');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ─── POST /api/discipline/cases ──────────────────────────────────────────────

describe('POST /api/discipline/cases', () => {
  const validBody = {
    studentId: 'stu_1',
    removalType: 'OUT_OF_SCHOOL_SUSPENSION',
    removalStartDate: '2026-01-10',
    removalEndDate: '2026-01-13',
    removalDays: 3,
    incidentDescription: 'Altercation on playground',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when removalType is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, removalType: 'UNKNOWN_TYPE' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when removalDays is negative', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, removalDays: -1 }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when incidentDescription is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', removalType: 'EXPULSION', removalStartDate: '2026-01-10', removalDays: 10 }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 201 and creates a discipline case', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockCreateDisciplineCase.mockResolvedValue(mockDisciplineCase);
    const { POST } = await import('@/app/api/discipline/cases/route');

    const req = new NextRequest('http://localhost/api/discipline/cases', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('case_1');
    expect(body.data.removalType).toBe('OUT_OF_SCHOOL_SUSPENSION');
    expect(mockCreateDisciplineCase).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        studentId: 'stu_1',
        removalType: 'OUT_OF_SCHOOL_SUSPENSION',
        createdBy: 'user_edu',
      }),
    );
  });
});

// ─── GET /api/discipline/cases/[caseId] ──────────────────────────────────────

describe('GET /api/discipline/cases/[caseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/discipline/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/discipline/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 200 with case detail for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCase.mockResolvedValue(mockDisciplineCase);
    const { GET } = await import('@/app/api/discipline/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('case_1');
  });

  it('returns 404 when case is not found', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCase.mockResolvedValue(null);
    const { GET } = await import('@/app/api/discipline/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ caseId: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when case belongs to a different tenant', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetCase.mockResolvedValue({ ...mockDisciplineCase, tenantId: 'tenant_other' });
    const { GET } = await import('@/app/api/discipline/cases/[caseId]/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/discipline/cases/[caseId]/close ───────────────────────────────

describe('POST /api/discipline/cases/[caseId]/close', () => {
  const validBody = { reason: 'Suspension period completed' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/close/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/close', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role (only admin can close cases)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/close/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/close', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when reason is empty', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/close/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/close', {
      method: 'POST',
      body: JSON.stringify({ reason: '' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason is missing entirely', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/close/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/close', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 200 with updated case for SCHOOL_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const closedCase = { ...mockDisciplineCase, status: 'CLOSED', closureReason: 'Suspension period completed' };
    mockCloseDisciplineCase.mockResolvedValue(closedCase);
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/close/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/close', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('CLOSED');
    expect(mockCloseDisciplineCase).toHaveBeenCalledWith(
      'case_1',
      'Suspension period completed',
      'user_admin',
    );
  });
});

// ─── POST /api/discipline/cases/[caseId]/manifest ────────────────────────────

describe('POST /api/discipline/cases/[caseId]/manifest', () => {
  const validBody = {
    meetingDate: '2026-01-15',
    attendees: [
      { name: 'Dr. Smith', role: 'Special Education Director' },
      { name: 'Jane Parent', role: 'Parent' },
    ],
    outcome: 'IS_MANIFESTATION',
    rationale: 'The conduct was directly caused by the student\'s disability',
    conductRelated: true,
    disabilityRelated: true,
    iepImplemented: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/manifest/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/manifest', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role (only admin can record MDR)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/manifest/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/manifest', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when outcome is invalid', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/manifest/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/manifest', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, outcome: 'INVALID_OUTCOME' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when rationale is missing', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/manifest/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/manifest', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, rationale: '' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 201 with MDR result for SCHOOL_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const mockMdr = {
      id: 'mdr_1',
      caseId: 'case_1',
      outcome: 'IS_MANIFESTATION',
      rationale: 'The conduct was directly caused by the student\'s disability',
      meetingDate: '2026-01-15',
      decidedBy: 'user_admin',
    };
    mockRecordManifestDetermination.mockResolvedValue(mockMdr);
    const { POST } = await import('@/app/api/discipline/cases/[caseId]/manifest/route');

    const req = new NextRequest('http://localhost/api/discipline/cases/case_1/manifest', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('mdr_1');
    expect(body.data.outcome).toBe('IS_MANIFESTATION');
    expect(mockRecordManifestDetermination).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        caseId: 'case_1',
        outcome: 'IS_MANIFESTATION',
        decidedBy: 'user_admin',
      }),
    );
  });
});

// ─── GET /api/discipline/compliance ──────────────────────────────────────────

describe('GET /api/discipline/compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/discipline/compliance/route');

    const req = new NextRequest('http://localhost/api/discipline/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/discipline/compliance/route');

    const req = new NextRequest('http://localhost/api/discipline/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns compliance check for a specific caseId', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockResult = {
      caseId: 'case_1',
      isCompliant: true,
      mdrRequired: false,
      mdrDeadline: null,
      cumulativeDays: 3,
      tenDayThresholdMet: false,
    };
    mockCheckDisciplineCompliance.mockResolvedValue(mockResult);
    const { GET } = await import('@/app/api/discipline/compliance/route');

    const req = new NextRequest('http://localhost/api/discipline/compliance?caseId=case_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.caseId).toBe('case_1');
    expect(body.data.isCompliant).toBe(true);
    expect(mockCheckDisciplineCompliance).toHaveBeenCalledWith('tenant_1', 'case_1');
  });

  it('returns aggregate metrics when no caseId provided', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const mockMetrics = {
      totalCases: 15,
      openCases: 4,
      mdrRequired: 1,
      cumulativeDaysExceeded: 2,
      iepStudentsAffected: 3,
    };
    mockGetDisciplineMetrics.mockResolvedValue(mockMetrics);
    const { GET } = await import('@/app/api/discipline/compliance/route');

    const req = new NextRequest('http://localhost/api/discipline/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalCases).toBe(15);
    expect(body.data.mdrRequired).toBe(1);
    expect(mockGetDisciplineMetrics).toHaveBeenCalledWith('tenant_1');
  });
});
