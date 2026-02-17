import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EngagementMode } from '@prisma/client';
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
    session: {
      findUnique: vi.fn(),
    },
    thinkingAssessment: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/assessments/thinking-evaluator', () => ({
  generateThinkingPrompt: vi.fn(async () => 'Generated thinking prompt'),
  evaluateThinkingQuality: vi.fn(async () => ({
    thinkingQuality: {
      reasoningArticulation: 4,
      assumptionAwareness: 3,
      evidenceEvaluation: 4,
      alternativePerspectives: 3,
      conclusionJustification: 4,
      metacognitiveAwareness: 3,
    },
    creativity: {
      fluency: 4,
      flexibility: 3,
      originality: 4,
      elaboration: 3,
      riskTaking: 2,
    },
    reasoningMovesUsed: ['DECOMPOSE', 'JUSTIFY'],
    aiAnalysis: 'Student demonstrated strong analytical skills',
    strengths: ['Clear reasoning', 'Good structure'],
    areasForGrowth: ['Could explore alternatives'],
  })),
}));

vi.mock('@/lib/assessments/reasoning-move-tracker', () => ({
  trackReasoningMove: vi.fn(async () => ({ success: true })),
}));

describe('POST /api/assessments/thinking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        problemContext: 'Solve 2x + 5 = 15',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  }, 15000);

  it('returns 400 when missing required fields', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
    } as any);

    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  }, 15000);

  it('returns 400 for invalid engagement mode', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
    } as any);

    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        problemContext: 'Solve 2x + 5 = 15',
        engagementMode: 'INVALID_MODE',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('generates thinking prompt successfully', async () => {
    const { db } = await import('@/lib/db');
    const { generateThinkingPrompt } = await import('@/lib/assessments/thinking-evaluator');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
    } as any);

    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        problemContext: 'Solve 2x + 5 = 15',
        engagementMode: 'FORWARD',
        targetReasoningMoves: ['DECOMPOSE'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.prompt).toBe('Generated thinking prompt');
    expect(data.mode).toBe('FORWARD');
    expect(generateThinkingPrompt).toHaveBeenCalledWith(
      'FORWARD',
      'Solve 2x + 5 = 15',
      ['DECOMPOSE']
    );
  });

  it('uses default engagement mode when not provided', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
    } as any);

    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        problemContext: 'Solve 2x + 5 = 15',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mode).toBe('FORWARD');
  });
});

describe('PUT /api/assessments/thinking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { PUT } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: 'message-1',
        studentResponse: 'My answer is...',
      }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it('evaluates thinking quality successfully', async () => {
    const { db } = await import('@/lib/db');
    const { evaluateThinkingQuality } = await import('@/lib/assessments/thinking-evaluator');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_1',
      clerkUserId: 'clerk_test_user',
      tenantId: 'tenant_1',
      role: 'STUDENT',
    } as any);

    vi.mocked(db.session.findUnique).mockResolvedValueOnce({
      id: 'session-1',
      student: { id: 'student-1' },
    } as any);

    vi.mocked(db.thinkingAssessment.create).mockResolvedValueOnce({
      id: 'assessment-1',
    } as any);

    const { PUT } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        studentResponse: 'First, I notice that 2x + 5 = 15. I need to isolate x.',
        problemContext: 'Solve 2x + 5 = 15',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.evaluation).toBeDefined();
    expect(evaluateThinkingQuality).toHaveBeenCalled();
  });
});
