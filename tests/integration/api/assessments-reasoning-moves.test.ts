import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReasoningMove } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_test_user' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    reasoningMoveTracking: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/assessments/reasoning-move-tracker', () => ({
  trackReasoningMove: vi.fn(async () => ({ success: true })),
  getStudentReasoningProfile: vi.fn(async () => ({
    studentId: 'test-student-id',
    totalMoves: 10,
    moveFrequency: {},
    recentMoves: [],
  })),
  suggestNextReasoningMoves: vi.fn(() => []),
  REASONING_MOVE_DESCRIPTIONS: {},
}));

describe('POST /api/assessments/reasoning-moves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { POST } = await import('@/app/api/assessments/reasoning-moves/route');
    const request = new NextRequest('http://localhost/api/assessments/reasoning-moves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student-1',
        move: 'DECOMPOSE',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 when missing required fields', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      isMinor: false,
      consentStatus: null,
    } as any);

    const { POST } = await import('@/app/api/assessments/reasoning-moves/route');
    const request = new NextRequest('http://localhost/api/assessments/reasoning-moves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        move: 'DECOMPOSE',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid reasoning move', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      isMinor: false,
      consentStatus: null,
    } as any);

    const { POST } = await import('@/app/api/assessments/reasoning-moves/route');
    const request = new NextRequest('http://localhost/api/assessments/reasoning-moves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student-1',
        move: 'INVALID_MOVE',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('tracks reasoning move successfully', async () => {
    const { db } = await import('@/lib/db');
    const { trackReasoningMove } = await import('@/lib/assessments/reasoning-move-tracker');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      isMinor: false,
      consentStatus: null,
    } as any);
    vi.mocked(db.student.findUnique).mockResolvedValueOnce({
      id: 'student-1',
      user: { id: 'user_1', tenantId: 'tenant_1' },
    } as any);

    const { POST } = await import('@/app/api/assessments/reasoning-moves/route');
    const request = new NextRequest('http://localhost/api/assessments/reasoning-moves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'student-1',
        move: 'DECOMPOSE',
        wasPrompted: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(trackReasoningMove).toHaveBeenCalledWith({
      studentId: 'student-1',
      move: 'DECOMPOSE',
      wasPrompted: false,
    });
  });
});

describe('GET /api/assessments/reasoning-moves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { GET } = await import('@/app/api/assessments/reasoning-moves/route');
    const request = new NextRequest('http://localhost/api/assessments/reasoning-moves?studentId=student-1', {
      method: 'GET',
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns reasoning profile for student', async () => {
    const { db } = await import('@/lib/db');
    const { getStudentReasoningProfile } = await import('@/lib/assessments/reasoning-move-tracker');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      isMinor: false,
      consentStatus: null,
    } as any);
    vi.mocked(db.student.findUnique).mockResolvedValueOnce({
      id: 'student-1',
      user: { id: 'user_1', tenantId: 'tenant_1' },
    } as any);
    const mockProfile = {
      studentId: 'student-1',
      totalMoves: 15,
      moveFrequency: {
        ANALYZE_STRUCTURE: 5,
        CHECK_UNDERSTANDING: 3,
      },
      recentMoves: [],
    };
    vi.mocked(getStudentReasoningProfile).mockResolvedValueOnce(mockProfile);

    const { GET } = await import('@/app/api/assessments/reasoning-moves/route');
    const request = new NextRequest('http://localhost/api/assessments/reasoning-moves?studentId=student-1', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toEqual(mockProfile);
  });
});
