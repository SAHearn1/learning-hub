import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockRequireRole = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockGenerateNotice = vi.fn();
const mockMarkNoticeDelivered = vi.fn();
const mockEvaluateProceduralSafeguards = vi.fn();
const mockUpsertProceduralEvent = vi.fn();
const mockGetNoticesForStudent = vi.fn();
const mockGetEventsForStudent = vi.fn();
const mockAcknowledgeNotice = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/db', () => ({
  db: {
    student: { findUnique: mockStudentFindUnique },
    tenant: { findUnique: mockTenantFindUnique },
  },
}));

vi.mock('@/lib/safeguards/procedural-safeguards.service', () => ({
  generateNotice: mockGenerateNotice,
  markNoticeDelivered: mockMarkNoticeDelivered,
  upsertProceduralEvent: mockUpsertProceduralEvent,
  getNoticesForStudent: mockGetNoticesForStudent,
  getEventsForStudent: mockGetEventsForStudent,
  acknowledgeNotice: mockAcknowledgeNotice,
}));

vi.mock('@/lib/safeguards/psn-evaluator', () => ({
  evaluateProceduralSafeguards: mockEvaluateProceduralSafeguards,
}));

vi.mock('@/lib/safeguards/school-year', () => ({
  getCurrentSchoolYear: vi.fn().mockReturnValue('2025-2026'),
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

const routeContextStudent = {
  params: Promise.resolve({ studentId: 'stu_1' }),
};

const routeContextNotice = {
  params: Promise.resolve({ noticeId: 'notice_1' }),
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
  parent: { childrenIds: ['stu_1'] },
};

const schoolAdminUser = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

const mockStudent = {
  id: 'stu_1',
  user: { firstName: 'Alex', lastName: 'Jordan' },
};

const mockTenant = {
  id: 'tenant_1',
  name: 'Riverside Unified School District',
};

const mockNotice = {
  id: 'notice_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  trigger: 'ANNUAL_NOTICE',
  deliveryMethod: 'PORTAL',
  issuedAt: new Date().toISOString(),
  deliveredAt: null,
  acknowledgedAt: null,
};

const mockNoticeContent = {
  html: '<p>Procedural safeguards notice content</p>',
  plainText: 'Procedural safeguards notice content',
};

const mockEvent = {
  id: 'event_1',
  tenantId: 'tenant_1',
  studentId: 'stu_1',
  eventType: 'ANNUAL_NOTICE_ISSUED',
  trigger: 'ANNUAL_NOTICE',
  schoolYear: '2025-2026',
  createdAt: new Date().toISOString(),
};

// ─── POST /api/safeguards/issue ───────────────────────────────────────────────

describe('POST /api/safeguards/issue', () => {
  const validBody = {
    studentId: 'stu_1',
    proceduralEventId: 'event_1',
    trigger: 'ANNUAL_NOTICE',
    deliveryMethod: 'PORTAL',
    markDelivered: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when trigger is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, trigger: 'INVALID_TRIGGER' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when studentId is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify({ proceduralEventId: 'event_1', trigger: 'ANNUAL_NOTICE' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when student is not found', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when tenant is not found', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue(mockStudent);
    mockTenantFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  it('returns 201 with notice and content without marking delivered', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue(mockStudent);
    mockTenantFindUnique.mockResolvedValue(mockTenant);
    mockGenerateNotice.mockResolvedValue({ notice: mockNotice, content: mockNoticeContent });
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, markDelivered: false }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.notice.id).toBe('notice_1');
    expect(body.data.content).toBeDefined();
    expect(mockMarkNoticeDelivered).not.toHaveBeenCalled();
    expect(mockGenerateNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        studentId: 'stu_1',
        studentName: 'Alex Jordan',
        districtName: 'Riverside Unified School District',
        trigger: 'ANNUAL_NOTICE',
      }),
    );
  });

  it('marks notice as delivered immediately when markDelivered is true', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue(mockStudent);
    mockTenantFindUnique.mockResolvedValue(mockTenant);
    mockGenerateNotice.mockResolvedValue({ notice: mockNotice, content: mockNoticeContent });
    const deliveredNotice = { ...mockNotice, deliveredAt: new Date().toISOString() };
    mockMarkNoticeDelivered.mockResolvedValue(deliveredNotice);
    const { POST } = await import('@/app/api/safeguards/issue/route');

    const req = new NextRequest('http://localhost/api/safeguards/issue', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, markDelivered: true }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.notice.deliveredAt).toBeDefined();
    expect(mockMarkNoticeDelivered).toHaveBeenCalledWith('notice_1', 'user_edu');
  });
});

// ─── POST /api/safeguards/validate ────────────────────────────────────────────

describe('POST /api/safeguards/validate', () => {
  const validBody = {
    trigger: 'ANNUAL_NOTICE',
    studentId: 'stu_1',
    schoolYear: '2025-2026',
    existingNotices: [],
    existingEvents: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/safeguards/validate/route');

    const req = new NextRequest('http://localhost/api/safeguards/validate', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/safeguards/validate/route');

    const req = new NextRequest('http://localhost/api/safeguards/validate', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when schoolYear format is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/safeguards/validate/route');

    const req = new NextRequest('http://localhost/api/safeguards/validate', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, schoolYear: '2025' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when trigger is invalid', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/safeguards/validate/route');

    const req = new NextRequest('http://localhost/api/safeguards/validate', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, trigger: 'NOT_A_TRIGGER' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 200 with evaluation result', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const mockResult = {
      required: true,
      alreadySentThisYear: false,
      lastSentDate: null,
      recommendation: 'ISSUE_NOTICE',
    };
    mockEvaluateProceduralSafeguards.mockReturnValue(mockResult);
    const { POST } = await import('@/app/api/safeguards/validate/route');

    const req = new NextRequest('http://localhost/api/safeguards/validate', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.required).toBe(true);
    expect(body.data.recommendation).toBe('ISSUE_NOTICE');
    expect(mockEvaluateProceduralSafeguards).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'ANNUAL_NOTICE',
        studentId: 'stu_1',
        schoolYear: '2025-2026',
      }),
    );
  });

  it('accepts optional caseId and proceduralEventId fields', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    mockEvaluateProceduralSafeguards.mockReturnValue({ required: false, alreadySentThisYear: true });
    const { POST } = await import('@/app/api/safeguards/validate/route');

    const req = new NextRequest('http://localhost/api/safeguards/validate', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, caseId: 'case_1', proceduralEventId: 'event_1' }),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/safeguards/request ────────────────────────────────────────────

describe('POST /api/safeguards/request', () => {
  const validBody = { studentId: 'stu_1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/safeguards/request/route');

    const req = new NextRequest('http://localhost/api/safeguards/request', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId is missing', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/safeguards/request/route');

    const req = new NextRequest('http://localhost/api/safeguards/request', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when student is not found', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockUpsertProceduralEvent.mockResolvedValue(mockEvent);
    mockStudentFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/safeguards/request/route');

    const req = new NextRequest('http://localhost/api/safeguards/request', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when tenant is not found', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockUpsertProceduralEvent.mockResolvedValue(mockEvent);
    mockStudentFindUnique.mockResolvedValue(mockStudent);
    mockTenantFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/safeguards/request/route');

    const req = new NextRequest('http://localhost/api/safeguards/request', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  it('returns 201 with event and delivered notice for parent request', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockUpsertProceduralEvent.mockResolvedValue(mockEvent);
    mockStudentFindUnique.mockResolvedValue(mockStudent);
    mockTenantFindUnique.mockResolvedValue(mockTenant);
    mockGenerateNotice.mockResolvedValue({ notice: mockNotice, content: mockNoticeContent });
    const deliveredNotice = { ...mockNotice, deliveredAt: new Date().toISOString() };
    mockMarkNoticeDelivered.mockResolvedValue(deliveredNotice);
    const { POST } = await import('@/app/api/safeguards/request/route');

    const req = new NextRequest('http://localhost/api/safeguards/request', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.event.id).toBe('event_1');
    expect(body.data.notice.deliveredAt).toBeDefined();
    expect(mockUpsertProceduralEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        studentId: 'stu_1',
        eventType: 'PARENT_SAFEGUARDS_REQUEST',
        trigger: 'PARENT_REQUEST',
        createdBy: 'user_parent',
      }),
    );
  });
});

// ─── GET /api/safeguards/notices/[studentId] ─────────────────────────────────

describe('GET /api/safeguards/notices/[studentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/safeguards/notices/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/notices/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(401);
  });

  it('returns 200 with notices list for EDUCATOR', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockGetNoticesForStudent.mockResolvedValue([mockNotice]);
    const { GET } = await import('@/app/api/safeguards/notices/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/notices/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('notice_1');
    expect(mockGetNoticesForStudent).toHaveBeenCalledWith('tenant_1', 'stu_1');
  });

  it('returns 200 with notices for PARENT accessing their child', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockGetNoticesForStudent.mockResolvedValue([mockNotice]);
    const { GET } = await import('@/app/api/safeguards/notices/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/notices/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns empty array when student has no notices', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockGetNoticesForStudent.mockResolvedValue([]);
    const { GET } = await import('@/app/api/safeguards/notices/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/notices/stu_no_notices');
    const res = await GET(req, { params: Promise.resolve({ studentId: 'stu_no_notices' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ─── GET /api/safeguards/events/[studentId] ──────────────────────────────────

describe('GET /api/safeguards/events/[studentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/safeguards/events/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/events/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role (staff-only endpoint)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/safeguards/events/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/events/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(403);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { GET } = await import('@/app/api/safeguards/events/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/events/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(403);
  });

  it('returns 200 with events list for EDUCATOR', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    mockGetEventsForStudent.mockResolvedValue([mockEvent]);
    const { GET } = await import('@/app/api/safeguards/events/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/events/stu_1');
    const res = await GET(req, routeContextStudent);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('event_1');
    expect(mockGetEventsForStudent).toHaveBeenCalledWith('tenant_1', 'stu_1');
  });

  it('returns empty array when student has no events', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    mockGetEventsForStudent.mockResolvedValue([]);
    const { GET } = await import('@/app/api/safeguards/events/[studentId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/events/stu_no_events');
    const res = await GET(req, { params: Promise.resolve({ studentId: 'stu_no_events' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ─── POST /api/safeguards/acknowledge/[noticeId] ─────────────────────────────

describe('POST /api/safeguards/acknowledge/[noticeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/safeguards/acknowledge/[noticeId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/acknowledge/notice_1', {
      method: 'POST',
    });
    const res = await POST(req, routeContextNotice);
    expect(res.status).toBe(401);
  });

  it('returns 200 with acknowledged notice for authenticated PARENT', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const acknowledgedNotice = {
      ...mockNotice,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: 'user_parent',
    };
    mockAcknowledgeNotice.mockResolvedValue(acknowledgedNotice);
    const { POST } = await import('@/app/api/safeguards/acknowledge/[noticeId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/acknowledge/notice_1', {
      method: 'POST',
    });
    const res = await POST(req, routeContextNotice);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('notice_1');
    expect(body.data.acknowledgedAt).toBeDefined();
    expect(mockAcknowledgeNotice).toHaveBeenCalledWith('notice_1', 'user_parent');
  });

  it('returns 200 with acknowledged notice for EDUCATOR', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const acknowledgedNotice = {
      ...mockNotice,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: 'user_edu',
    };
    mockAcknowledgeNotice.mockResolvedValue(acknowledgedNotice);
    const { POST } = await import('@/app/api/safeguards/acknowledge/[noticeId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/acknowledge/notice_1', {
      method: 'POST',
    });
    const res = await POST(req, routeContextNotice);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.acknowledgedBy).toBe('user_edu');
  });

  it('propagates service errors when notice is not found', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { NotFoundError } = await import('@/lib/api-errors');
    mockAcknowledgeNotice.mockRejectedValue(new NotFoundError('Notice not found'));
    const { POST } = await import('@/app/api/safeguards/acknowledge/[noticeId]/route');

    const req = new NextRequest('http://localhost/api/safeguards/acknowledge/nonexistent', {
      method: 'POST',
    });
    const res = await POST(req, { params: Promise.resolve({ noticeId: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});
