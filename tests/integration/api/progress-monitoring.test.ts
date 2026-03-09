import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockGetGoalsForStudent = vi.fn();
const mockCreateGoal = vi.fn();
const mockGetGoal = vi.fn();
const mockUpdateGoalStatus = vi.fn();
const mockAddProgressEntry = vi.fn();
const mockGetEntriesForGoal = vi.fn();
const mockCheckComplianceForGoal = vi.fn();
const mockGenerateProgressReport = vi.fn();
const mockGetReportsForGoal = vi.fn();
const mockAcknowledgeReport = vi.fn();
const mockMarkReportDelivered = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/progress-monitoring/progress-monitoring.service', () => ({
  getGoalsForStudent: mockGetGoalsForStudent,
  createGoal: mockCreateGoal,
  getGoal: mockGetGoal,
  updateGoalStatus: mockUpdateGoalStatus,
  addProgressEntry: mockAddProgressEntry,
  getEntriesForGoal: mockGetEntriesForGoal,
  checkComplianceForGoal: mockCheckComplianceForGoal,
  generateProgressReport: mockGenerateProgressReport,
  getReportsForGoal: mockGetReportsForGoal,
  acknowledgeReport: mockAcknowledgeReport,
  markReportDelivered: mockMarkReportDelivered,
}));

vi.mock('@/lib/db', () => ({
  db: {
    iepGoal: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    progressMonitoringReport: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
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

const goalCtx = { params: Promise.resolve({ goalId: 'goal_1' }) };
const reportCtx = { params: Promise.resolve({ goalId: 'goal_1', reportId: 'report_1' }) };

const educatorUser = { id: 'user_educator', tenantId: 'tenant_1', role: 'EDUCATOR' };
const parentUser = { id: 'user_parent', tenantId: 'tenant_1', role: 'PARENT' };

const mockGoal = {
  id: 'goal_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  goalCode: 'MATH-001',
  description: 'Student will improve addition fluency',
  status: 'ACTIVE',
  baselineValue: 10,
  baselineDate: '2026-01-01',
  targetValue: 30,
  targetDate: '2026-06-01',
  measurementMethod: 'CURRICULUM_BASED',
  measurementUnit: 'correct per minute',
  reportingFrequency: 'BIWEEKLY',
  monitoringIntervalDays: 14,
  createdBy: 'user_educator',
  createdAt: new Date().toISOString(),
};

const mockEntry = {
  id: 'entry_1',
  goalId: 'goal_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  recordedValue: 18,
  measurementMethod: 'CURRICULUM_BASED',
  observationDate: '2026-02-01',
  notes: 'Good session',
  recordedBy: 'user_educator',
  recordedAt: new Date().toISOString(),
};

const mockReport = {
  id: 'report_1',
  goalId: 'goal_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  reportingPeriodStart: '2026-01-01',
  reportingPeriodEnd: '2026-01-31',
  generatedBy: 'user_educator',
  generatedAt: new Date().toISOString(),
  deliveredAt: null,
  acknowledgedAt: null,
};

const mockReportContent = {
  summary: 'Student showed 80% progress toward goal.',
  trendAnalysis: 'Upward trend observed.',
};

const validGoalBody = {
  studentId: 'stu_1',
  goalCode: 'MATH-001',
  description: 'Student will improve addition fluency',
  baselineValue: 10,
  baselineDate: '2026-01-01',
  targetValue: 30,
  targetDate: '2026-06-01',
  measurementMethod: 'CURRICULUM_BASED',
  measurementUnit: 'correct per minute',
  reportingFrequency: 'BIWEEKLY',
  monitoringIntervalDays: 14,
};

// ─── GET /api/progress-monitoring/goals ─────────────────────────────────────

describe('GET /api/progress-monitoring/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId query param is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/studentId/i);
  });

  it('returns 200 with goals list for valid educator + studentId', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetGoalsForStudent.mockResolvedValue([mockGoal]);
    const { GET } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('goal_1');
    expect(mockGetGoalsForStudent).toHaveBeenCalledWith('tenant_1', 'stu_1');
  });

  it('PARENT role is blocked from listing goals (403)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/progress-monitoring/goals ────────────────────────────────────

describe('POST /api/progress-monitoring/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals', {
      method: 'POST',
      body: JSON.stringify(validGoalBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 400 on schema validation failure when required fields are missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }), // missing goalCode, description, baselineValue, etc.
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('creates goal and returns 201 for educator with valid body', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockCreateGoal.mockResolvedValue(mockGoal);
    const { POST } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals', {
      method: 'POST',
      body: JSON.stringify(validGoalBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('goal_1');
    expect(body.data.goalCode).toBe('MATH-001');
    expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        studentId: 'stu_1',
        goalCode: 'MATH-001',
        createdBy: 'user_educator',
      }),
    );
  });

  it('returns 403 when PARENT attempts to create a goal', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/progress-monitoring/goals/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals', {
      method: 'POST',
      body: JSON.stringify(validGoalBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/progress-monitoring/goals/[goalId] ────────────────────────────

describe('GET /api/progress-monitoring/goals/[goalId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(401);
  });

  it('returns 200 with goal data for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetGoal.mockResolvedValue(mockGoal);
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('goal_1');
    expect(body.data.description).toBe('Student will improve addition fluency');
    expect(mockGetGoal).toHaveBeenCalledWith('goal_1');
  });

  it('returns 200 with goal data for PARENT (read access)', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    mockGetGoal.mockResolvedValue(mockGoal);
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('goal_1');
  });
});

// ─── PATCH /api/progress-monitoring/goals/[goalId] ──────────────────────────

describe('PATCH /api/progress-monitoring/goals/[goalId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { PATCH } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const res = await PATCH(req, goalCtx);
    expect(res.status).toBe(401);
  });

  it('updates status to COMPLETED for educator and returns 200', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const updatedGoal = { ...mockGoal, status: 'COMPLETED' };
    mockUpdateGoalStatus.mockResolvedValue(updatedGoal);
    const { PATCH } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const res = await PATCH(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('COMPLETED');
    expect(mockUpdateGoalStatus).toHaveBeenCalledWith('goal_1', 'COMPLETED', 'user_educator');
  });

  it('returns 403 when PARENT attempts to update status', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { PATCH } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const res = await PATCH(req, goalCtx);
    expect(res.status).toBe(403);
  });

  it('returns 400 when status value is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { PATCH } = await import('@/app/api/progress-monitoring/goals/[goalId]/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INVALID_STATUS' }),
    });
    const res = await PATCH(req, goalCtx);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/progress-monitoring/goals/[goalId]/entries ────────────────────

describe('GET /api/progress-monitoring/goals/[goalId]/entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(401);
  });

  it('returns 200 with entries list for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetEntriesForGoal.mockResolvedValue([mockEntry]);
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('entry_1');
    expect(mockGetEntriesForGoal).toHaveBeenCalledWith('goal_1');
  });

  it('returns 200 with entries list for PARENT (read access)', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    mockGetEntriesForGoal.mockResolvedValue([mockEntry]);
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].recordedValue).toBe(18);
  });
});

// ─── POST /api/progress-monitoring/goals/[goalId]/entries ───────────────────

describe('POST /api/progress-monitoring/goals/[goalId]/entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries', {
      method: 'POST',
      body: JSON.stringify({
        recordedValue: 18,
        measurementMethod: 'CURRICULUM_BASED',
        observationDate: '2026-02-01',
      }),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(401);
  });

  it('creates entry with valid body and returns 201 for educator', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.iepGoal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'goal_1',
      studentId: 'stu_1',
    });
    mockAddProgressEntry.mockResolvedValue(mockEntry);
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries', {
      method: 'POST',
      body: JSON.stringify({
        recordedValue: 18,
        measurementMethod: 'CURRICULUM_BASED',
        observationDate: '2026-02-01',
        notes: 'Good session',
      }),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('entry_1');
    expect(body.data.recordedValue).toBe(18);
    expect(mockAddProgressEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        goalId: 'goal_1',
        studentId: 'stu_1',
        tenantId: 'tenant_1',
        recordedBy: 'user_educator',
        recordedValue: 18,
        measurementMethod: 'CURRICULUM_BASED',
      }),
    );
  });

  it('returns 400 when required entry fields are missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries', {
      method: 'POST',
      body: JSON.stringify({ recordedValue: 18 }), // missing measurementMethod and observationDate
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(400);
  });

  it('returns 400 when measurementMethod is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/entries/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/entries', {
      method: 'POST',
      body: JSON.stringify({
        recordedValue: 18,
        measurementMethod: 'INVALID_METHOD',
        observationDate: '2026-02-01',
      }),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/progress-monitoring/goals/[goalId]/reports ────────────────────

describe('GET /api/progress-monitoring/goals/[goalId]/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(401);
  });

  it('returns 200 with reports list for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetReportsForGoal.mockResolvedValue([mockReport]);
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('report_1');
    expect(mockGetReportsForGoal).toHaveBeenCalledWith('goal_1');
  });

  it('returns 200 with reports list for PARENT (read access)', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    mockGetReportsForGoal.mockResolvedValue([mockReport]);
    const { GET } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports');
    const res = await GET(req, goalCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].goalId).toBe('goal_1');
  });
});

// ─── POST /api/progress-monitoring/goals/[goalId]/reports ───────────────────

describe('POST /api/progress-monitoring/goals/[goalId]/reports', () => {
  const validReportBody = {
    reportingPeriodStart: '2026-01-01',
    reportingPeriodEnd: '2026-01-31',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports', {
      method: 'POST',
      body: JSON.stringify(validReportBody),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 when PARENT attempts to generate a report', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports', {
      method: 'POST',
      body: JSON.stringify(validReportBody),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(403);
  });

  it('creates report and returns 201 for educator with valid body', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.iepGoal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'goal_1',
      studentId: 'stu_1',
    });
    (db.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'stu_1',
      user: { firstName: 'Alex', lastName: 'Smith' },
    });
    (db.tenant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'tenant_1',
      name: 'Oakwood Unified',
    });
    mockGenerateProgressReport.mockResolvedValue({
      report: mockReport,
      content: mockReportContent,
    });
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports', {
      method: 'POST',
      body: JSON.stringify(validReportBody),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.report.id).toBe('report_1');
    expect(body.data.content).toBeDefined();
    expect(mockGenerateProgressReport).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        goalId: 'goal_1',
        studentId: 'stu_1',
        studentName: 'Alex Smith',
        districtName: 'Oakwood Unified',
        reportingPeriodStart: '2026-01-01',
        reportingPeriodEnd: '2026-01-31',
        generatedBy: 'user_educator',
      }),
    );
  });

  it('returns 400 when reporting period fields are missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports', {
      method: 'POST',
      body: JSON.stringify({ reportingPeriodStart: '2026-01-01' }), // missing reportingPeriodEnd
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(400);
  });

  it('returns 404 when student is not found', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.iepGoal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'goal_1',
      studentId: 'stu_missing',
    });
    (db.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { POST } = await import('@/app/api/progress-monitoring/goals/[goalId]/reports/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/goals/goal_1/reports', {
      method: 'POST',
      body: JSON.stringify(validReportBody),
    });
    const res = await POST(req, goalCtx);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/progress-monitoring/goals/[goalId]/reports/[reportId]/acknowledge

describe('POST /api/progress-monitoring/goals/[goalId]/reports/[reportId]/acknowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import(
      '@/app/api/progress-monitoring/goals/[goalId]/reports/[reportId]/acknowledge/route'
    );

    const req = new NextRequest(
      'http://localhost/api/progress-monitoring/goals/goal_1/reports/report_1/acknowledge',
      { method: 'POST' },
    );
    const res = await POST(req, reportCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 when EDUCATOR attempts to acknowledge (PARENT only)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import(
      '@/app/api/progress-monitoring/goals/[goalId]/reports/[reportId]/acknowledge/route'
    );

    const req = new NextRequest(
      'http://localhost/api/progress-monitoring/goals/goal_1/reports/report_1/acknowledge',
      { method: 'POST' },
    );
    const res = await POST(req, reportCtx);
    expect(res.status).toBe(403);
  });

  it('acknowledges report and returns 200 for PARENT', async () => {
    mockRequireRole.mockResolvedValue(parentUser);
    const acknowledgedReport = {
      ...mockReport,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: 'user_parent',
    };
    mockAcknowledgeReport.mockResolvedValue(acknowledgedReport);
    const { POST } = await import(
      '@/app/api/progress-monitoring/goals/[goalId]/reports/[reportId]/acknowledge/route'
    );

    const req = new NextRequest(
      'http://localhost/api/progress-monitoring/goals/goal_1/reports/report_1/acknowledge',
      { method: 'POST' },
    );
    const res = await POST(req, reportCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.acknowledgedAt).toBeDefined();
    expect(mockAcknowledgeReport).toHaveBeenCalledWith('report_1', 'user_parent');
  });
});

// ─── POST /api/progress-monitoring/goals/[goalId]/reports/[reportId]/deliver

describe('POST /api/progress-monitoring/goals/[goalId]/reports/[reportId]/deliver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import(
      '@/app/api/progress-monitoring/goals/[goalId]/reports/[reportId]/deliver/route'
    );

    const req = new NextRequest(
      'http://localhost/api/progress-monitoring/goals/goal_1/reports/report_1/deliver',
      { method: 'POST' },
    );
    const res = await POST(req, reportCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 when PARENT attempts to deliver (EDUCATOR only)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import(
      '@/app/api/progress-monitoring/goals/[goalId]/reports/[reportId]/deliver/route'
    );

    const req = new NextRequest(
      'http://localhost/api/progress-monitoring/goals/goal_1/reports/report_1/deliver',
      { method: 'POST' },
    );
    const res = await POST(req, reportCtx);
    expect(res.status).toBe(403);
  });

  it('marks report as delivered and returns 200 for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const deliveredReport = {
      ...mockReport,
      deliveredAt: new Date().toISOString(),
      deliveredBy: 'user_educator',
    };
    mockMarkReportDelivered.mockResolvedValue(deliveredReport);
    const { POST } = await import(
      '@/app/api/progress-monitoring/goals/[goalId]/reports/[reportId]/deliver/route'
    );

    const req = new NextRequest(
      'http://localhost/api/progress-monitoring/goals/goal_1/reports/report_1/deliver',
      { method: 'POST' },
    );
    const res = await POST(req, reportCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deliveredAt).toBeDefined();
    expect(mockMarkReportDelivered).toHaveBeenCalledWith('report_1', 'user_educator');
  });
});

// ─── GET /api/progress-monitoring/compliance ────────────────────────────────

describe('GET /api/progress-monitoring/compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/progress-monitoring/compliance/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/compliance?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId query param is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/progress-monitoring/compliance/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/compliance');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/studentId/i);
  });

  it('returns compliance results per active goal for a student', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    const activeGoals = [
      { id: 'goal_1', studentId: 'stu_1', status: 'ACTIVE' },
      { id: 'goal_2', studentId: 'stu_1', status: 'ACTIVE' },
    ];
    (db.iepGoal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(activeGoals);
    const complianceResults = [
      { goalId: 'goal_1', passed: true, lastEntryDate: '2026-02-01', daysSinceLastEntry: 7 },
      { goalId: 'goal_2', passed: false, lastEntryDate: '2026-01-10', daysSinceLastEntry: 35 },
    ];
    mockCheckComplianceForGoal
      .mockResolvedValueOnce(complianceResults[0])
      .mockResolvedValueOnce(complianceResults[1]);
    const { GET } = await import('@/app/api/progress-monitoring/compliance/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/compliance?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.studentId).toBe('stu_1');
    expect(body.data.goalCount).toBe(2);
    expect(body.data.passed).toBe(false); // one goal is non-compliant
    expect(body.data.results).toHaveLength(2);
    expect(db.iepGoal.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1', studentId: 'stu_1', status: 'ACTIVE' },
    });
  });

  it('returns passed:true when all active goals are compliant', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.iepGoal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'goal_1', studentId: 'stu_1', status: 'ACTIVE' },
    ]);
    mockCheckComplianceForGoal.mockResolvedValue({
      goalId: 'goal_1',
      passed: true,
      lastEntryDate: '2026-02-10',
      daysSinceLastEntry: 5,
    });
    const { GET } = await import('@/app/api/progress-monitoring/compliance/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/compliance?studentId=stu_1');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.passed).toBe(true);
    expect(body.data.goalCount).toBe(1);
  });

  it('returns passed:true with empty results when student has no active goals', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.iepGoal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { GET } = await import('@/app/api/progress-monitoring/compliance/route');

    const req = new NextRequest('http://localhost/api/progress-monitoring/compliance?studentId=stu_no_goals');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.studentId).toBe('stu_no_goals');
    expect(body.data.goalCount).toBe(0);
    expect(body.data.passed).toBe(true); // every([]) === true
    expect(body.data.results).toEqual([]);
  });
});
