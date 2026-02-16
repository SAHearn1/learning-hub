import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockClassFindUnique = vi.fn();
const mockEnrollmentFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mockClassFindUnique },
    classEnrollment: { findMany: mockEnrollmentFindMany },
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
const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };

describe('GET /api/lms/classes/[classId]/roster', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when class not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 for cross-tenant class', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_other' });
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(403);
  });

  it('returns roster with student stats', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1', name: 'Math 101' });
    mockEnrollmentFindMany.mockResolvedValue([
      {
        enrolledAt: new Date('2026-01-15'),
        student: {
          id: 'stu_1',
          gradeLevel: 7,
          user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@test.edu' },
          progress: [{ masteryLevel: 80, standardId: 's1' }, { masteryLevel: 90, standardId: 's2' }],
          _count: { sessions: 5, submissions: 3 },
        },
      },
    ]);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeCtx('cls_1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Alice Smith');
    expect(body.data[0].totalSessions).toBe(5);
    expect(body.data[0].averageMastery).toBe(85);
    expect(body.className).toBe('Math 101');
  });

  it('returns null averageMastery when no progress data', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1', name: 'Eng 101' });
    mockEnrollmentFindMany.mockResolvedValue([
      {
        enrolledAt: new Date(),
        student: {
          id: 'stu_2',
          gradeLevel: 8,
          user: { firstName: 'Bob', lastName: 'Jones', email: 'bob@test.edu' },
          progress: [],
          _count: { sessions: 0, submissions: 0 },
        },
      },
    ]);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeCtx('cls_1'));

    const body = await res.json();
    expect(body.data[0].averageMastery).toBeNull();
  });
});
