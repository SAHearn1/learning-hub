import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockClassFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockEnrollmentUpsert = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mockClassFindUnique },
    student: { findUnique: mockStudentFindUnique },
    classEnrollment: { upsert: mockEnrollmentUpsert },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const makeCtx = (classId: string) => ({ params: Promise.resolve({ classId }) });

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

describe('POST /api/educator/classes/[classId]/enroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentId is missing', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when class not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when class belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_other' });
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when student belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockStudentFindUnique.mockResolvedValue({ id: 'stu_1', user: { tenantId: 'tenant_other' } });
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(403);
  });

  it('returns 201 and creates enrollment successfully', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockStudentFindUnique.mockResolvedValue({ id: 'stu_1', user: { tenantId: 'tenant_1' } });
    mockEnrollmentUpsert.mockResolvedValue({
      id: 'enroll_1',
      classId: 'cls_1',
      studentId: 'stu_1',
      status: 'ACTIVE',
      tenantId: 'tenant_1',
    });
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.classId).toBe('cls_1');
    expect(body.data.studentId).toBe('stu_1');
    expect(body.data.status).toBe('ACTIVE');

    expect(mockEnrollmentUpsert).toHaveBeenCalledWith({
      where: { classId_studentId: { classId: 'cls_1', studentId: 'stu_1' } },
      update: { status: 'ACTIVE' },
      create: { tenantId: 'tenant_1', classId: 'cls_1', studentId: 'stu_1' },
    });
  });

  it('returns 404 when student not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockStudentFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/educator/classes/[classId]/enroll/route');

    const req = new NextRequest('http://localhost/api/educator/classes/cls_1/enroll', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_missing' }),
    });
    const res = await POST(req, makeCtx('cls_1'));
    expect(res.status).toBe(404);
  });
});
