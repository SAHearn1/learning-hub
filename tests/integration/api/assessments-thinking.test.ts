import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EngagementMode } from '@prisma/client';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_test_user' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    session: {
      findUnique: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/assessments/thinking-evaluator', () => ({
  generateThinkingPrompt: vi.fn(async () => 'Generated thinking prompt'),
  evaluateThinkingQuality: vi.fn(async () => ({
    quality: 'high',
    bloomsLevel: 'ANALYZE',
    reasoningDepth: 4,
    feedback: 'Good reasoning',
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
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-1',
        problemContext: 'Solve 2x + 5 = 15',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 when missing required fields', async () => {
    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-1',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid engagement mode', async () => {
    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'POST',
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
    const { generateThinkingPrompt } = await import('@/lib/assessments/thinking-evaluator');

    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-1',
        problemContext: 'Solve 2x + 5 = 15',
        engagementMode: 'FORWARD',
        targetReasoningMoves: ['ANALYZE_STRUCTURE'],
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
      ['ANALYZE_STRUCTURE']
    );
  });

  it('uses default engagement mode when not provided', async () => {
    const { POST } = await import('@/app/api/assessments/thinking/route');
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'POST',
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
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'PUT',
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

    vi.mocked(db.message.findUnique).mockResolvedValueOnce({
      id: 'message-1',
      content: 'Solve this problem',
      role: 'assistant',
    } as any);

    vi.mocked(db.message.update).mockResolvedValueOnce({
      id: 'message-1',
      thinkingQuality: 'high',
    } as any);

    const { PUT } = await import('@/app/api/assessments/thinking/route');
    const request = new Request('http://localhost/api/assessments/thinking', {
      method: 'PUT',
      body: JSON.stringify({
        messageId: 'message-1',
        studentResponse: 'First, I notice that 2x + 5 = 15. I need to isolate x.',
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
