import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockStudentFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: { student: { findMany: mockStudentFindMany } },
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

const routeContext = { params: Promise.resolve({}) };

describe('GET /api/parent/children', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/parent/children/route');

    const req = new NextRequest('http://localhost/api/parent/children');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not a parent', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'EDUCATOR' });
    const { GET } = await import('@/app/api/parent/children/route');

    const req = new NextRequest('http://localhost/api/parent/children');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 403 when parent profile is missing', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'PARENT', parent: null });
    const { GET } = await import('@/app/api/parent/children/route');

    const req = new NextRequest('http://localhost/api/parent/children');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns empty array when parent has no children', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_parent',
      tenantId: 'tenant_1',
      role: 'PARENT',
      parent: { id: 'parent_1', childrenIds: [] },
    });
    const { GET } = await import('@/app/api/parent/children/route');

    const req = new NextRequest('http://localhost/api/parent/children');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(mockStudentFindMany).not.toHaveBeenCalled();
  });

  it('returns children with progress and session data', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_parent',
      tenantId: 'tenant_1',
      role: 'PARENT',
      parent: { id: 'parent_1', childrenIds: ['child_user_1'] },
    });
    mockStudentFindMany.mockResolvedValue([
      {
        id: 'student_1',
        userId: 'child_user_1',
        gradeLevel: 5,
        user: { firstName: 'Alice', lastName: 'Smith' },
        progress: [
          { masteryLevel: 75, standard: { code: '5.NF.A.1', subject: 'MATH', description: 'Add fractions' } },
        ],
        sessions: [
          { id: 'sess_1', subject: 'MATH', currentPhase: 'ROOT', startedAt: new Date(), endedAt: null, _count: { messages: 3 } },
        ],
        _count: { sessions: 5, progress: 2 },
      },
    ]);
    const { GET } = await import('@/app/api/parent/children/route');

    const req = new NextRequest('http://localhost/api/parent/children');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].user.firstName).toBe('Alice');
    expect(body.data[0].progress).toHaveLength(1);
    expect(body.data[0].sessions).toHaveLength(1);
    expect(body.data[0]._count.sessions).toBe(5);

    expect(mockStudentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['child_user_1'] } },
      }),
    );
  });
});
