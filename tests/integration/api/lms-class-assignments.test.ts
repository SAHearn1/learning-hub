import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockClassFindUnique = vi.fn();
const mockAssignmentFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mockClassFindUnique },
    assignment: { findMany: mockAssignmentFindMany },
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
const studentUser = { id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT', student: { id: 'stu_1' } };

describe('GET /api/lms/classes/[classId]/assignments', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/assignments');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when class not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/assignments');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 for cross-tenant class', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_other' });
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/assignments');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(403);
  });

  it('students see only published assignments with own submissions', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockAssignmentFindMany.mockResolvedValue([
      {
        id: 'a1', title: 'HW1', published: true,
        _count: { submissions: 5 },
        submissions: [{ id: 'sub_1', status: 'SUBMITTED', grade: null }],
      },
    ]);
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');

    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/assignments');
    const res = await GET(req, makeCtx('cls_1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { classId: 'cls_1', published: true } }),
    );
  });

  it('educator sees all assignments', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockAssignmentFindMany.mockResolvedValue([
      { id: 'a1', published: true, _count: { submissions: 3 } },
      { id: 'a2', published: false, _count: { submissions: 0 } },
    ]);
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');

    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/assignments');
    const res = await GET(req, makeCtx('cls_1'));
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { classId: 'cls_1' } }),
    );
  });
});
