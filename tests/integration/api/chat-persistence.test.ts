import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockEnforceUsageLimits = vi.fn();
const mockTrackReasoningMove = vi.fn();
const mockEvaluateThinkingQuality = vi.fn();

const mockDb = {
  tenant: {
    findUnique: vi.fn(),
  },
  student: {
    upsert: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  thinkingAssessment: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
}));

vi.mock('@/lib/usage-limits', async () => {
  const actual = await vi.importActual<typeof import('@/lib/usage-limits')>('@/lib/usage-limits');
  return {
    ...actual,
    enforceUsageLimits: mockEnforceUsageLimits,
  };
});

vi.mock('@/lib/assessments/thinking-evaluator', () => ({
  generateThinkingPrompt: vi.fn(async () => 'Generated thinking prompt'),
  evaluateThinkingQuality: mockEvaluateThinkingQuality,
}));

vi.mock('@/lib/assessments/reasoning-move-tracker', () => ({
  trackReasoningMove: mockTrackReasoningMove,
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));
vi.mock('@/lib/compliance', () => ({
  hasRequiredMinorConsent: vi.fn(() => true),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

describe('Chat session persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      student: { id: 'student_1' },
    });

    mockEnforceUsageLimits.mockResolvedValue(undefined);
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant_1' });
  });

  it('creates a new session tied to the authenticated student', async () => {
    mockDb.session.create.mockResolvedValueOnce({
      id: 'session_1',
      studentId: 'student_1',
      tenantId: 'tenant_1',
      currentPhase: 'ROOT',
      engagementMode: 'FORWARD',
      subject: 'MATH',
    });

    const { POST } = await import('@/app/api/sessions/route');
    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', engagementMode: 'FORWARD' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockDb.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student_1',
          tenantId: 'tenant_1',
          currentPhase: 'ROOT',
        }),
      })
    );
  });

  it('stores a thinking assessment and tracks reasoning moves for the same session', async () => {
    mockDb.session.findUnique.mockResolvedValueOnce({
      id: 'session_1',
      student: { id: 'student_1' },
    });

    mockEvaluateThinkingQuality.mockResolvedValueOnce({
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
      reasoningMovesUsed: ['ANALOGY', 'JUSTIFY'],
      aiAnalysis: 'Strong structured response',
      strengths: ['logical flow'],
      areasForGrowth: ['more alternatives'],
    });

    mockDb.thinkingAssessment.create.mockResolvedValueOnce({ id: 'assessment_1' });

    const { PUT } = await import('@/app/api/assessments/thinking/route');
    const request = new NextRequest('http://localhost/api/assessments/thinking', {
      method: 'PUT',
      body: JSON.stringify({
        sessionId: 'session_1',
        studentResponse: 'Fractions are parts of a whole, like slices of a pizza.',
        problemContext: 'Explain why 1/2 is larger than 1/4.',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);

    expect(mockDb.thinkingAssessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'session_1',
          rawResponse: 'Fractions are parts of a whole, like slices of a pizza.',
        }),
      })
    );

    expect(mockTrackReasoningMove).toHaveBeenCalledTimes(2);
    expect(mockTrackReasoningMove).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'student_1', move: 'ANALOGY' })
    );
  });
});

