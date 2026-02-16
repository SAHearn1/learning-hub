import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthenticationError, BadRequestError, ForbiddenError, NotFoundError } from '@/lib/api-errors';

const mockRequireUser = vi.fn();
const mockGetCachedSession = vi.fn();
const mockInvalidateSessionCache = vi.fn();
const mockEnforceUsageLimits = vi.fn();
const mockEvaluateOrganizationTokenUsage = vi.fn();
const mockDbMessageCreate = vi.fn();
const mockAIUsageLedgerCreate = vi.fn();
const mockAppendImmutableAuditLog = vi.fn();
const mockAnthropicStream = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
}));

vi.mock('@/lib/redis/cached-queries', () => ({
  getCachedSession: mockGetCachedSession,
  getCachedUserProfile: vi.fn(),
  invalidateSessionCache: mockInvalidateSessionCache,
}));

vi.mock('@/lib/usage-limits', () => ({
  enforceUsageLimits: mockEnforceUsageLimits,
  evaluateOrganizationTokenUsage: mockEvaluateOrganizationTokenUsage,
  UsageLimitError: class extends Error {},
}));

vi.mock('@/lib/db', () => ({
  db: {
    message: {
      create: mockDbMessageCreate,
    },
    session: {
      update: vi.fn(),
    },
    aIUsageLedger: {
      create: mockAIUsageLedgerCreate,
    },
    thinkingAssessment: {
      create: vi.fn(),
    },
    reasoningMoveProgress: {
      upsert: vi.fn(),
    },
    topic: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/vector-search', () => ({
  searchCurriculum: vi.fn().mockResolvedValue([]),
  formatCurriculumContext: vi.fn().mockReturnValue(''),
}));

vi.mock('@/lib/ai/client', () => ({
  anthropic: {
    messages: {
      stream: mockAnthropicStream,
    },
  },
  AI_MODELS: {
    primary: 'test-model',
  },
}));

vi.mock('@/lib/ai/prompts/master-system-prompt', () => ({
  buildMasterSystemPrompt: vi.fn().mockReturnValue('system prompt'),
}));

vi.mock('@/lib/regulation/detector', () => ({
  detectDysregulation: vi.fn().mockReturnValue({ signals: [], severity: 'none' }),
  updateRegulationLevel: vi.fn((level: number) => level),
  analyzeSentiment: vi.fn().mockReturnValue({ label: 'neutral', score: 0 }),
}));

vi.mock('@/lib/regulation/sentiment-classifier', () => ({
  classifySentiment: vi.fn().mockReturnValue({
    stressLevel: 'low',
    shouldIntervene: false,
    detectedPatterns: [],
    exercise: null,
  }),
  formatInterventionMessage: vi.fn(),
}));

vi.mock('@/lib/five-rs/state-machine', () => ({
  computePhaseTransition: vi.fn((phase: string) => phase),
  buildFiveRStateSnapshot: vi.fn().mockReturnValue({
    currentPhase: 'ROOT',
    phaseHistory: [],
    sentiment: { label: 'neutral', score: 0 },
    regulationPassed: true,
    updatedAt: new Date().toISOString(),
  }),
}));

vi.mock('@/lib/privacy', () => ({
  anonymizeForLlmWithMap: vi.fn((text: string) => ({ sanitizedText: text, tokenMap: {} })),
  reattachPii: vi.fn((text: string) => text),
}));

vi.mock('@/lib/trace/tracker', () => ({
  analyzeThinkingQuality: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/nvc/evaluation-service', () => ({
  createNVCEvaluation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/monitoring', () => ({
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  appendImmutableAuditLog: mockAppendImmutableAuditLog,
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceUsageLimits.mockResolvedValue(undefined);
    mockEvaluateOrganizationTokenUsage.mockResolvedValue({
      organizationId: 'tenant_123',
      projectedDailyTokens: 1000,
      baselineDailyTokens: 900,
      spikeRatio: 1.11,
      dailyHardLimitTokens: 250000,
      spikeDetected: false,
    });
    mockDbMessageCreate.mockResolvedValue({ id: 'msg_1' });
    mockAIUsageLedgerCreate.mockResolvedValue({});
    mockAppendImmutableAuditLog.mockResolvedValue(undefined);
  });

  it('throws AuthenticationError when not authenticated', async () => {
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Hello' }),
    });

    await expect(POST(req)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('throws NotFoundError when student profile is missing', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_123',
      tenantId: 'tenant_123',
      student: null,
    });
    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Hello' }),
    });

    await expect(POST(req)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when session is missing', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_123',
      tenantId: 'tenant_123',
      student: { id: 'student_123', gradeLevel: 5, learningPreferences: {}, iepAccommodations: [] },
    });
    mockGetCachedSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Hello' }),
    });

    await expect(POST(req)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when session belongs to another student', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_123',
      tenantId: 'tenant_123',
      student: { id: 'student_123', gradeLevel: 5, learningPreferences: {}, iepAccommodations: [] },
    });
    mockGetCachedSession.mockResolvedValue({
      id: 'session_123',
      studentId: 'different_student',
      endedAt: null,
      messages: [],
      currentPhase: 'ROOT',
      subject: 'MATH',
      engagementMode: 'FORWARD',
      metadata: {},
      regulationState: { level: 70, signals: [], interventionCount: 0 },
    });
    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Hello' }),
    });

    await expect(POST(req)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws BadRequestError when session has already ended', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_123',
      tenantId: 'tenant_123',
      student: { id: 'student_123', gradeLevel: 5, learningPreferences: {}, iepAccommodations: [] },
    });
    mockGetCachedSession.mockResolvedValue({
      id: 'session_123',
      studentId: 'student_123',
      endedAt: new Date().toISOString(),
      messages: [],
      currentPhase: 'ROOT',
      subject: 'MATH',
      engagementMode: 'FORWARD',
      metadata: {},
      regulationState: { level: 70, signals: [], interventionCount: 0 },
    });
    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Hello' }),
    });

    await expect(POST(req)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('returns SSE response and persists refusal for personal trade advice prompts', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_123',
      tenantId: 'tenant_123',
      student: { id: 'student_123', gradeLevel: 5, learningPreferences: {}, iepAccommodations: [] },
    });
    mockGetCachedSession.mockResolvedValue({
      id: 'session_123',
      studentId: 'student_123',
      endedAt: null,
      messages: [],
      currentPhase: 'ROOT',
      subject: 'FINANCIAL_LITERACY',
      engagementMode: 'FORWARD',
      metadata: {},
      regulationState: { level: 70, signals: [], interventionCount: 0 },
    });

    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Should I buy TSLA today?' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(mockDbMessageCreate).toHaveBeenCalled();
    expect(mockInvalidateSessionCache).toHaveBeenCalledWith('session_123');
  });

  it('streams normal assistant response and persists assistant + usage ledger', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'user_123',
      tenantId: 'tenant_123',
      student: {
        id: 'student_123',
        gradeLevel: 5,
        learningPreferences: {},
        iepAccommodations: [],
      },
    });
    mockGetCachedSession.mockResolvedValue({
      id: 'session_123',
      studentId: 'student_123',
      endedAt: null,
      messages: [],
      currentPhase: 'ROOT',
      subject: 'MATH',
      engagementMode: 'FORWARD',
      metadata: {},
      regulationState: { level: 70, signals: [], interventionCount: 0 },
    });

    mockDbMessageCreate
      .mockResolvedValueOnce({ id: 'msg_user' })
      .mockResolvedValueOnce({ id: 'msg_assistant' });

    mockAnthropicStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Let us solve this step by step.' },
        };
      },
      finalMessage: async () => ({
        usage: {
          input_tokens: 42,
          output_tokens: 84,
        },
      }),
    });

    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_123', message: 'Help me with fractions' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    // Consume the SSE body so stream completion side effects (assistant save, usage ledger) run.
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    expect(mockAnthropicStream).toHaveBeenCalled();
    expect(mockDbMessageCreate).toHaveBeenCalledTimes(2);
    expect(mockAIUsageLedgerCreate).toHaveBeenCalled();
    expect(mockAppendImmutableAuditLog).toHaveBeenCalled();
    expect(mockInvalidateSessionCache).toHaveBeenCalledWith('session_123');
  });
});
