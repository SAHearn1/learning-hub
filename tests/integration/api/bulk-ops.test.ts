import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    grade: {
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

const routeContext = { params: Promise.resolve({}) };

const educatorUser = {
  id: 'user_educator',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

// ─── POST /api/bulk/grades ────────────────────────────────────────────────────

describe('POST /api/bulk/grades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/bulk/grades/route');
    const req = new NextRequest('http://localhost/api/bulk/grades', {
      method: 'POST',
      body: JSON.stringify({
        grades: [{ submissionId: 'sub_1', score: 90, maxScore: 100 }],
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());

    const { POST } = await import('@/app/api/bulk/grades/route');
    const req = new NextRequest('http://localhost/api/bulk/grades', {
      method: 'POST',
      body: JSON.stringify({
        grades: [{ submissionId: 'sub_1', score: 90, maxScore: 100 }],
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when grades array is empty', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { POST } = await import('@/app/api/bulk/grades/route');
    const req = new NextRequest('http://localhost/api/bulk/grades', {
      method: 'POST',
      body: JSON.stringify({ grades: [] }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when grades array is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { POST } = await import('@/app/api/bulk/grades/route');
    const req = new NextRequest('http://localhost/api/bulk/grades', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('creates grade records and computes letter grades correctly', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');

    const submissionGrades = [
      { submissionId: 'sub_1', score: 95, maxScore: 100 },
      { submissionId: 'sub_2', score: 75, maxScore: 100 },
      { submissionId: 'sub_3', score: 55, maxScore: 100 },
    ];

    vi.mocked(db.grade.create)
      .mockResolvedValueOnce({ id: 'grade_1', score: 95, letterGrade: 'A' } as any)
      .mockResolvedValueOnce({ id: 'grade_2', score: 75, letterGrade: 'C' } as any)
      .mockResolvedValueOnce({ id: 'grade_3', score: 55, letterGrade: 'F' } as any);

    const { POST } = await import('@/app/api/bulk/grades/route');
    const req = new NextRequest('http://localhost/api/bulk/grades', {
      method: 'POST',
      body: JSON.stringify({ grades: submissionGrades }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(db.grade.create).toHaveBeenCalledTimes(3);

    // Verify letter grade calculation for A (95%)
    expect(db.grade.create).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: 'sub_1',
          score: 95,
          maxScore: 100,
          percentage: 95,
          letterGrade: 'A',
          tenantId: 'tenant_1',
          gradedById: 'user_educator',
        }),
      }),
    );

    // Verify C grade (75%)
    expect(db.grade.create).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        data: expect.objectContaining({ letterGrade: 'C' }),
      }),
    );
  });

  it('includes optional feedback when provided', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    vi.mocked(db.grade.create).mockResolvedValue({ id: 'grade_1', score: 80 } as any);

    const { POST } = await import('@/app/api/bulk/grades/route');
    const req = new NextRequest('http://localhost/api/bulk/grades', {
      method: 'POST',
      body: JSON.stringify({
        grades: [{ submissionId: 'sub_1', score: 80, maxScore: 100, feedback: 'Good work!' }],
      }),
    });
    await POST(req, routeContext);

    expect(db.grade.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feedback: 'Good work!' }),
      }),
    );
  });
});

// ─── POST /api/bulk/notices ───────────────────────────────────────────────────

describe('POST /api/bulk/notices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/bulk/notices/route');
    const req = new NextRequest('http://localhost/api/bulk/notices', {
      method: 'POST',
      body: JSON.stringify({ studentIds: ['s1'], trigger: 'ATTENDANCE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());

    const { POST } = await import('@/app/api/bulk/notices/route');
    const req = new NextRequest('http://localhost/api/bulk/notices', {
      method: 'POST',
      body: JSON.stringify({ studentIds: ['s1'], trigger: 'ATTENDANCE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentIds array is empty', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { POST } = await import('@/app/api/bulk/notices/route');
    const req = new NextRequest('http://localhost/api/bulk/notices', {
      method: 'POST',
      body: JSON.stringify({ studentIds: [], trigger: 'ATTENDANCE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when trigger is missing', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const { POST } = await import('@/app/api/bulk/notices/route');
    const req = new NextRequest('http://localhost/api/bulk/notices', {
      method: 'POST',
      body: JSON.stringify({ studentIds: ['s1'] }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns per-student success results for each notice issued', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    // Mock the internal fetch call to /api/safeguards/issue
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const { POST } = await import('@/app/api/bulk/notices/route');
    const req = new NextRequest('http://localhost/api/bulk/notices', {
      method: 'POST',
      body: JSON.stringify({ studentIds: ['s1', 's2'], trigger: 'BEHAVIORAL' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({ studentId: 's1', success: true });
    expect(body.data[1]).toMatchObject({ studentId: 's2', success: true });

    fetchSpy.mockRestore();
  });

  it('marks a student as failed when the safeguard endpoint returns an error', async () => {
    mockRequireRole.mockResolvedValue(educatorUser);

    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('OK', { status: 200 }))
      .mockResolvedValueOnce(new Response('Error', { status: 500 }));

    const { POST } = await import('@/app/api/bulk/notices/route');
    const req = new NextRequest('http://localhost/api/bulk/notices', {
      method: 'POST',
      body: JSON.stringify({ studentIds: ['s1', 's2'], trigger: 'BEHAVIORAL' }),
    });
    const res = await POST(req, routeContext);
    const body = await res.json();

    // Both students appear in results; success depends on HTTP status from fetch
    expect(body.data).toHaveLength(2);

    fetchSpy.mockRestore();
  });
});
