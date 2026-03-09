import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_teacher_school_b' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    class: {
      findUnique: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
    assessment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/redis/cached-queries', () => ({
  getCachedUserProfile: vi.fn(),
  getCachedSession: vi.fn(),
  invalidateSessionCache: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

describe('Multi-tenant isolation audit (RLS-style negative paths)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('profiles: blocks School B teacher from listing School A class roster', async () => {
    const { db } = await import('@/lib/db');
    const { requireUser } = await import('@/lib/auth');

    vi.mocked(requireUser).mockResolvedValueOnce({
      id: 'teacher_b',
      clerkUserId: 'clerk_teacher_school_b',
      tenantId: 'school_b',
      role: 'EDUCATOR',
    } as any);

    vi.mocked(db.class.findUnique).mockResolvedValueOnce({
      tenantId: 'school_a',
    } as any);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students?classId=class_school_a');

    const response = await GET(req);

    expect(response.status).toBe(403);
    expect(db.student.findMany).not.toHaveBeenCalled();
    expect(db.student.count).not.toHaveBeenCalled();
  });

  it('assignments: blocks School B teacher from reading School A session assessments', async () => {
    const { db } = await import('@/lib/db');
    const { requireUser } = await import('@/lib/auth');

    vi.mocked(requireUser).mockResolvedValueOnce({
      id: 'teacher_b',
      clerkUserId: 'clerk_teacher_school_b',
      tenantId: 'school_b',
      role: 'EDUCATOR',
    } as any);

    vi.mocked(db.session.findUnique).mockResolvedValueOnce({
      id: 'session_school_a',
      tenantId: 'school_a',
      student: { userId: 'student_user_a' },
    } as any);

    const { GET } = await import('@/app/api/assessments/route');
    const req = new NextRequest('http://localhost:3000/api/assessments?sessionId=session_school_a');

    const response = await GET(req);

    expect(response.status).toBe(403);
    expect(db.assessment.findMany).not.toHaveBeenCalled();
  });

  it('chats: blocks School B teacher token from School A student chat session', async () => {
    const { getCachedSession } = await import('@/lib/redis/cached-queries');
    const { requireUser } = await import('@/lib/auth');

    vi.mocked(requireUser).mockResolvedValueOnce({
      id: 'user_school_b',
      tenantId: 'school_b',
      role: 'EDUCATOR',
      isMinor: false,
      consentStatus: null,
      student: {
        id: 'student_b',
        gradeLevel: 6,
        learningPreferences: {},
        iepAccommodations: [],
      },
    } as any);

    vi.mocked(getCachedSession).mockResolvedValueOnce({
      id: 'session_school_a',
      tenantId: 'school_a',
      studentId: 'student_a',
      endedAt: null,
      messages: [],
      regulationState: { level: 70 },
      subject: 'MATH',
      engagementMode: 'FORWARD',
    } as any);

    const { POST } = await import('@/app/api/chat/route');
    const routeContext = { params: Promise.resolve({}) };
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_school_a', message: 'hello' }),
    });

    const response = await POST(req, routeContext);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Only students can access chat sessions');
  }, 15000);
});



