import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
const mockDb = {
  user: { findUnique: vi.fn() },
  assessment: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/monitoring', () => ({ captureError: vi.fn() }));

describe('POST /api/assessments/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns standardized validation error contract', async () => {
    const { POST } = await import('../route');
    mockAuth.mockReturnValue({ userId: 'clerk_1' });
    mockDb.user.findUnique.mockResolvedValue({ id: 'u1', tenantId: 't1', role: 'EDUCATOR' });

    const response = await POST(
      new NextRequest('http://localhost/api/assessments/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assessmentId: 'a1', rubricScore: 200, comments: 'x' }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBeTruthy();
  });

  it('returns standardized auth error contract', async () => {
    const { GET } = await import('../route');
    mockAuth.mockReturnValue({ userId: null });

    const response = await GET(new NextRequest('http://localhost/api/assessments/review'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });
});
