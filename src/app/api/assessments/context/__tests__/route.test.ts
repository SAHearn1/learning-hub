import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
const mockDb = {
  user: { findUnique: vi.fn() },
  session: { findFirst: vi.fn() },
};

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };

describe('GET /api/assessments/context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns standardized 401 error when unauthenticated', async () => {
    const { GET } = await import('../route');
    mockAuth.mockReturnValue({ userId: null });

    const response = await GET(new NextRequest('http://localhost/api/assessments/context'), routeContext);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
    expect(body.requestId).toBeTruthy();
  });

  it('returns learner context when authenticated', async () => {
    const { GET } = await import('../route');
    mockAuth.mockReturnValue({ userId: 'clerk_1' });
    mockDb.user.findUnique.mockResolvedValue({ student: { id: 'stu_1', gradeLevel: 6 } });
    mockDb.session.findFirst.mockResolvedValue({ id: 'sess_1', subject: 'MATH' });

    const response = await GET(new NextRequest('http://localhost/api/assessments/context'), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.studentId).toBe('stu_1');
    expect(body.data.sessionId).toBe('sess_1');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
  });
});
