import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockProgressFindMany = vi.fn();
const mockReasoningMoveFindMany = vi.fn();
const mockSessionFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { findUnique: mockStudentFindUnique },
    progress: { findMany: mockProgressFindMany },
    reasoningMoveProgress: { findMany: mockReasoningMoveFindMany },
    session: { findMany: mockSessionFindMany },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const makeCtx = (studentId: string) => ({ params: Promise.resolve({ studentId }) });

const parentUser = {
  id: 'user_parent',
  tenantId: 'tenant_1',
  role: 'PARENT',
  parent: { id: 'parent_1', childrenIds: ['child_user_1'] },
};

describe('GET /api/parent/progress/[studentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_1');
    const res = await GET(req, makeCtx('stu_1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not a parent', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'EDUCATOR' });
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_1');
    const res = await GET(req, makeCtx('stu_1'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when parent profile is missing', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'PARENT', parent: null });
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_1');
    const res = await GET(req, makeCtx('stu_1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when student not found', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockStudentFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_missing');
    const res = await GET(req, makeCtx('stu_missing'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when student is not parent\'s child', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_other',
      userId: 'other_user_id',
      gradeLevel: 5,
      user: { firstName: 'Bob', lastName: 'Jones' },
    });
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_other');
    const res = await GET(req, makeCtx('stu_other'));
    expect(res.status).toBe(403);
  });

  it('returns full progress data for parent\'s child', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_1',
      userId: 'child_user_1',
      gradeLevel: 5,
      user: { firstName: 'Alice', lastName: 'Smith' },
    });
    mockProgressFindMany.mockResolvedValue([
      { masteryLevel: 90, standard: { code: '5.NF.A.1', subject: 'MATH' } },
      { masteryLevel: 60, standard: { code: '5.NF.A.2', subject: 'MATH' } },
    ]);
    mockReasoningMoveFindMany.mockResolvedValue([
      { move: 'PATTERN_RECOGNITION', proficiencyLevel: 3, usageCount: 5 },
    ]);
    mockSessionFindMany.mockResolvedValue([
      { id: 'sess_1', subject: 'MATH', _count: { messages: 4, assessments: 1 } },
    ]);
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_1');
    const res = await GET(req, makeCtx('stu_1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.student.name).toBe('Alice Smith');
    expect(body.data.summary.totalStandards).toBe(2);
    expect(body.data.summary.averageMastery).toBe(75);
    expect(body.data.summary.masteredCount).toBe(1);
    expect(body.data.summary.inProgressCount).toBe(1);
    expect(body.data.summary.totalSessions).toBe(1);
    expect(body.data.reasoningMoves).toHaveLength(1);
  });

  it('filters progress by subject when param provided', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockStudentFindUnique.mockResolvedValue({
      id: 'stu_1',
      userId: 'child_user_1',
      gradeLevel: 5,
      user: { firstName: 'Alice', lastName: 'Smith' },
    });
    mockProgressFindMany.mockResolvedValue([]);
    mockReasoningMoveFindMany.mockResolvedValue([]);
    mockSessionFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/parent/progress/[studentId]/route');

    const req = new NextRequest('http://localhost/api/parent/progress/stu_1?subject=SCIENCE');
    const res = await GET(req, makeCtx('stu_1'));
    expect(res.status).toBe(200);

    expect(mockProgressFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'stu_1',
          standard: { subject: 'SCIENCE' },
        }),
      }),
    );
  });
});
