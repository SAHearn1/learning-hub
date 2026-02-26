import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockClassFindUnique = vi.fn();
const mockClassEnrollmentUpsert = vi.fn();
const mockAppendAuditLog = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mockClassFindUnique },
    classEnrollment: { upsert: mockClassEnrollmentUpsert },
  },
}));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAppendAuditLog }));
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

// ─── Fixtures ───────────────────────────────────────────────────────────────

const routeCtx = { params: Promise.resolve({}) };

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

const classRecord = {
  id: 'class_1',
  tenantId: 'tenant_1',
  name: 'Math 101',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/student/classes/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ classId: 'class_1' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ classId: 'class_1' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns 400 when classId is missing', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(400);
  });

  it('returns 404 when class does not exist', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockClassFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ classId: 'nonexistent_class' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(404);
  });

  it('returns 403 when class belongs to a different tenant', async () => {
    mockRequireUser.mockResolvedValue(studentUser); // tenantId: tenant_1
    mockClassFindUnique.mockResolvedValue({ ...classRecord, tenantId: 'tenant_OTHER' });
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ classId: 'class_1' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('enrolls student successfully and returns 201', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockClassFindUnique.mockResolvedValue(classRecord);
    mockClassEnrollmentUpsert.mockResolvedValue({
      id: 'enrollment_1',
      classId: 'class_1',
      studentId: 'stu_1',
      status: 'ACTIVE',
    });
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ classId: 'class_1' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.enrollmentId).toBe('enrollment_1');
    expect(body.data.classId).toBe('class_1');
    expect(body.data.className).toBe('Math 101');
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STUDENT_JOIN_CLASS' }),
    );
  });

  it('re-enrolls student (upsert) when previously enrolled', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockClassFindUnique.mockResolvedValue(classRecord);
    // upsert re-activates the existing record
    mockClassEnrollmentUpsert.mockResolvedValue({
      id: 'enrollment_existing',
      classId: 'class_1',
      studentId: 'stu_1',
      status: 'ACTIVE',
    });
    const { POST } = await import('@/app/api/student/classes/join/route');

    const req = new NextRequest('http://localhost/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ classId: 'class_1' }),
    });
    const res = await POST(req, routeCtx);
    // upsert is idempotent — route should still return 201
    expect(res.status).toBe(201);
  });
});
