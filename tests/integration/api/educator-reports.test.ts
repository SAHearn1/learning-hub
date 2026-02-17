import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockClassFindUnique = vi.fn();
const mockEnrollmentFindMany = vi.fn();
const mockStudentFindUnique = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mockClassFindUnique },
    classEnrollment: { findMany: mockEnrollmentFindMany },
    student: { findUnique: mockStudentFindUnique },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };

const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };

describe('GET /api/educator/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?classId=cls_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?classId=cls_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when neither classId nor studentId provided', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('classId or studentId');
  });

  it('returns class-level report with mastery calculation', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockEnrollmentFindMany.mockResolvedValue([
      {
        student: {
          id: 'stu_1',
          gradeLevel: 5,
          user: { firstName: 'Alice', lastName: 'Smith' },
          progress: [
            { masteryLevel: 80, standard: { code: '5.NF.A.1' } },
            { masteryLevel: 60, standard: { code: '5.NF.A.2' } },
          ],
          sessions: [{ startedAt: new Date(), endedAt: null, currentPhase: 'ROOT' }],
          _count: { sessions: 10 },
        },
      },
    ]);
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?classId=cls_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Alice Smith');
    expect(body.data[0].averageMastery).toBe(70);
    expect(body.data[0].standardsTracked).toBe(2);
    expect(body.data[0].totalSessions).toBe(10);
  });

  it('returns 403 when class belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_other' });
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?classId=cls_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns student report for valid studentId', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_1',
      gradeLevel: 5,
      user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@school.edu', tenantId: 'tenant_1' },
      progress: [{ masteryLevel: 75, standard: { code: '5.NF.A.1' } }],
      iepAccommodations: [],
      thinkingProgress: [],
      sessions: [],
    });
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBe('stu_1');
    expect(body.data.user.firstName).toBe('Alice');
  });

  it('returns 404 when student not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?studentId=stu_missing');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when student belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_1',
      user: { tenantId: 'tenant_other' },
    });
    const { GET } = await import('@/app/api/educator/reports/route');

    const req = new NextRequest('http://localhost/api/educator/reports?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });
});
