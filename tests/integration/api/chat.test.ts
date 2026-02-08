import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_test_user_123' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    aIUsageLedger: {
      create: vi.fn(),
    },
    thinkingAssessment: {
      create: vi.fn(),
    },
    reasoningMoveProgress: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/usage-limits', () => ({
  enforceUsageLimits: vi.fn(() => Promise.resolve()),
  UsageLimitError: class extends Error {},
}));

vi.mock('@/lib/regulation/detector', () => ({
  detectDysregulation: vi.fn(() => ({
    signals: [],
    severity: 'none',
    recommendation: 'continue',
  })),
  updateRegulationLevel: vi.fn((current: number) => current),
}));

vi.mock('@/lib/trace/tracker', () => ({
  analyzeThinkingQuality: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/five-rs/phase-transition', () => ({
  getRecommendedPhaseTransition: vi.fn(() => null),
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { POST } = await import('@/app/api/chat/route');
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session_123',
        message: 'Hello',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 404 when student profile not found', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/chat/route');
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session_123',
        message: 'Hello',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it('returns 404 when session not found', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_test_user_123',
      tenantId: 'tenant_123',
      student: {
        id: 'student_123',
        gradeLevel: 5,
        learningPreferences: {},
        iepAccommodations: [],
      },
    } as any);
    vi.mocked(db.session.findUnique).mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/chat/route');
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session_123',
        message: 'Hello',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it('returns 403 when session belongs to different student', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_test_user_123',
      tenantId: 'tenant_123',
      student: {
        id: 'student_123',
        gradeLevel: 5,
        learningPreferences: {},
        iepAccommodations: [],
      },
    } as any);
    vi.mocked(db.session.findUnique).mockResolvedValueOnce({
      id: 'session_123',
      studentId: 'different_student',
      messages: [],
      endedAt: null,
    } as any);

    const { POST } = await import('@/app/api/chat/route');
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session_123',
        message: 'Hello',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('streams chat response for valid request', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_test_user_123',
      tenantId: 'tenant_123',
      student: {
        id: 'student_123',
        gradeLevel: 5,
        learningPreferences: {},
        iepAccommodations: [],
      },
    } as any);
    vi.mocked(db.session.findUnique).mockResolvedValueOnce({
      id: 'session_123',
      studentId: 'student_123',
      messages: [],
      endedAt: null,
      currentPhase: 'RELATE',
      subject: 'MATH',
      engagementMode: 'GUIDED_INQUIRY',
      regulationState: { level: 70 },
    } as any);
    vi.mocked(db.message.create).mockResolvedValue({} as any);
    vi.mocked(db.aIUsageLedger.create).mockResolvedValue({} as any);

    const { POST } = await import('@/app/api/chat/route');
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session_123',
        message: 'Help me with math',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });
});
