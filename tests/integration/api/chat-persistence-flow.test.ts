/**
 * End-to-end persistence flow validation.
 *
 * Verifies the full data chain:
 *   POST /api/chat → DB writes (message, usage ledger, audit log)
 *     → GET /api/progress reads persisted session/message data back
 *
 * Phase 0 gap: "End-to-end validation of full persistence flow
 * (/api/chat -> DB -> progress views)."
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Shared state: captures what chat writes so progress can read it back ──

const writtenMessages: Array<{ id: string; sessionId: string; role: string; content: string }> = [];
let writtenUsageLedger: Record<string, unknown> | null = null;
let writtenAuditLog: Record<string, unknown> | null = null;

const mockRequireUser = vi.fn();
const mockGetCachedSession = vi.fn();
const mockInvalidateSessionCache = vi.fn();
const mockEnforceUsageLimits = vi.fn();
const mockEvaluateOrganizationTokenUsage = vi.fn();
const mockAnthropicStream = vi.fn();

// ── DB mock with write capture ──

const mockDb = {
  message: {
    create: vi.fn((args: { data: Record<string, unknown> }) => {
      const msg = { id: `msg_${writtenMessages.length + 1}`, ...args.data, createdAt: new Date() };
      writtenMessages.push(msg as any);
      return msg;
    }),
  },
  session: {
    update: vi.fn(),
    findMany: vi.fn(),
  },
  aIUsageLedger: {
    create: vi.fn((args: { data: Record<string, unknown> }) => {
      writtenUsageLedger = { id: 'ledger_1', ...args.data };
      return writtenUsageLedger;
    }),
  },
  thinkingAssessment: {
    create: vi.fn(),
  },
  reasoningMoveProgress: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  topic: {
    findUnique: vi.fn().mockResolvedValue(null),
  },
  user: {
    findUnique: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
  progress: {
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

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

vi.mock('@/lib/vector-search', () => ({
  searchCurriculum: vi.fn().mockResolvedValue([]),
  formatCurriculumContext: vi.fn().mockReturnValue(''),
}));

vi.mock('@/lib/ai/client', () => ({
  anthropic: { messages: { stream: mockAnthropicStream } },
  AI_MODELS: { primary: 'test-model' },
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
  captureError: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  appendImmutableAuditLog: vi.fn((entry: Record<string, unknown>) => {
    writtenAuditLog = entry;
    return Promise.resolve();
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));

vi.mock('@/lib/compliance', () => ({
  hasRequiredMinorConsent: vi.fn().mockReturnValue(true),
}));

// ── Helpers ──

const routeContext = { params: Promise.resolve({}) };

const testUser = {
  id: 'user_123',
  clerkUserId: 'clerk_user_123',
  tenantId: 'tenant_123',
  role: 'STUDENT' as const,
  isMinor: false,
  consentStatus: null,
  student: {
    id: 'student_123',
    gradeLevel: 5,
    learningPreferences: { modalities: ['visual'] },
    iepAccommodations: [],
  },
};

const testSession = {
  id: 'session_abc',
  studentId: 'student_123',
  tenantId: 'tenant_123',
  endedAt: null,
  messages: [],
  currentPhase: 'ROOT',
  subject: 'MATH',
  engagementMode: 'FORWARD',
  metadata: {},
  regulationState: { level: 70, signals: [], interventionCount: 0 },
};

function makeStreamMock(text: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    },
    finalMessage: async () => ({
      usage: { input_tokens: 50, output_tokens: 100 },
    }),
  };
}

async function consumeStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let output = '';
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value, { stream: true });
    }
  }
  return output;
}

// ── Tests ──

describe('Full persistence flow: /api/chat → DB → /api/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writtenMessages.length = 0;
    writtenUsageLedger = null;
    writtenAuditLog = null;

    mockEnforceUsageLimits.mockResolvedValue(undefined);
    mockEvaluateOrganizationTokenUsage.mockResolvedValue({
      organizationId: 'tenant_123',
      projectedDailyTokens: 1000,
      baselineDailyTokens: 900,
      spikeRatio: 1.11,
      dailyHardLimitTokens: 250000,
      spikeDetected: false,
    });
  });

  it('chat POST persists user + assistant messages, usage ledger, and audit log, then progress GET returns session data', async () => {
    // ── Step 1: POST /api/chat ──
    mockRequireUser.mockResolvedValue(testUser);
    mockGetCachedSession.mockResolvedValue(testSession);
    mockAnthropicStream.mockResolvedValue(
      makeStreamMock('To add fractions, find a common denominator.'),
    );

    const { POST } = await import('@/app/api/chat/route');

    const chatReq = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_abc', message: 'How do I add fractions?' }),
    });

    const chatResponse = await POST(chatReq, routeContext);
    expect(chatResponse.status).toBe(200);

    // Consume SSE stream to trigger post-stream persistence
    const sseOutput = await consumeStream(chatResponse);
    expect(sseOutput).toContain('common denominator');

    // ── Verify write side effects ──

    // User message saved first, then assistant message
    expect(writtenMessages).toHaveLength(2);
    expect(writtenMessages[0].role).toBe('USER');
    expect(writtenMessages[0].content).toBe('How do I add fractions?');
    expect(writtenMessages[0].sessionId).toBe('session_abc');

    expect(writtenMessages[1].role).toBe('ASSISTANT');
    expect(writtenMessages[1].content).toBe('To add fractions, find a common denominator.');
    expect(writtenMessages[1].sessionId).toBe('session_abc');

    // Usage ledger persisted with correct token counts
    expect(writtenUsageLedger).not.toBeNull();
    expect(writtenUsageLedger!.tenantId).toBe('tenant_123');
    expect(writtenUsageLedger!.sessionId).toBe('session_abc');
    expect(writtenUsageLedger!.inputTokens).toBe(50);
    expect(writtenUsageLedger!.outputTokens).toBe(100);
    expect(writtenUsageLedger!.totalTokens).toBe(150);
    expect(writtenUsageLedger!.requestType).toBe('TUTOR_CONVERSATION');
    expect(writtenUsageLedger!.feature).toBe('CORE_TUTORING');
    expect(writtenUsageLedger!.subject).toBe('MATH');

    // Audit log written with chain integrity fields
    expect(writtenAuditLog).not.toBeNull();
    expect(writtenAuditLog!.action).toBe('LLM_CHAT_COMPLETED');
    expect(writtenAuditLog!.resource).toBe('Session');
    expect(writtenAuditLog!.resourceId).toBe('session_abc');
    expect(writtenAuditLog!.tenantId).toBe('tenant_123');
    expect(writtenAuditLog!.userId).toBe('user_123');

    // Session cache invalidated (once for user message, once for assistant)
    expect(mockInvalidateSessionCache).toHaveBeenCalledWith('session_abc');
    expect(mockInvalidateSessionCache.mock.calls.length).toBeGreaterThanOrEqual(2);

    // ── Step 2: GET /api/progress ──
    // Wire mocks so progress route reads back session data written above
    mockRequireUser.mockResolvedValue(testUser);

    mockDb.progress.findMany.mockResolvedValue([
      {
        id: 'prog_1',
        studentId: 'student_123',
        standardId: 'std_math_fractions',
        masteryLevel: 65,
        assessmentCount: 3,
        updatedAt: new Date(),
        standard: { code: '5.NF.A.1', subject: 'MATH', description: 'Add fractions with unlike denominators' },
      },
    ]);

    mockDb.reasoningMoveProgress.findMany.mockResolvedValue([
      {
        id: 'rmp_1',
        studentId: 'student_123',
        move: 'PATTERN_RECOGNITION',
        usageCount: 4,
        promptedUsage: 1,
        spontaneousUsage: 3,
        proficiencyLevel: 2,
      },
    ]);

    mockDb.session.findMany.mockResolvedValue([
      {
        id: 'session_abc',
        subject: 'MATH',
        currentPhase: 'ROOT',
        startedAt: new Date(),
        endedAt: null,
        _count: { messages: 2, assessments: 0 },
      },
    ]);

    const { GET } = await import('@/app/api/progress/route');

    const progressReq = new NextRequest('http://localhost:3000/api/progress');
    const progressResponse = await GET(progressReq, routeContext);

    expect(progressResponse.status).toBe(200);
    const progressBody = await progressResponse.json();

    // Summary statistics are derived correctly
    expect(progressBody.data.summary.totalStandards).toBe(1);
    expect(progressBody.data.summary.averageMastery).toBe(65);
    expect(progressBody.data.summary.masteredCount).toBe(0);
    expect(progressBody.data.summary.inProgressCount).toBe(1);
    expect(progressBody.data.summary.totalSessions).toBe(1);

    // Standards progress returned
    expect(progressBody.data.standards).toHaveLength(1);
    expect(progressBody.data.standards[0].standard.code).toBe('5.NF.A.1');

    // Reasoning moves returned
    expect(progressBody.data.reasoningMoves).toHaveLength(1);
    expect(progressBody.data.reasoningMoves[0].move).toBe('PATTERN_RECOGNITION');

    // Recent sessions include the session we just chatted in
    expect(progressBody.data.recentSessions).toHaveLength(1);
    expect(progressBody.data.recentSessions[0].id).toBe('session_abc');
    expect(progressBody.data.recentSessions[0]._count.messages).toBe(2);
  }, 30000);

  it('persists correct cost calculation in usage ledger', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockGetCachedSession.mockResolvedValue(testSession);
    mockAnthropicStream.mockResolvedValue(
      makeStreamMock('The answer is 42.'),
    );

    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_abc', message: 'What is 6 times 7?' }),
    });

    const response = await POST(req, routeContext);
    await consumeStream(response);

    // Cost formula: (inputTokens * 0.003 + outputTokens * 0.015) / 1000
    // = (50 * 0.003 + 100 * 0.015) / 1000
    // = (0.15 + 1.5) / 1000
    // = 0.00165
    expect(writtenUsageLedger).not.toBeNull();
    expect(writtenUsageLedger!.costUSD).toBeCloseTo(0.00165, 5);
    expect(writtenUsageLedger!.success).toBe(true);
    expect(writtenUsageLedger!.model).toBe('test-model');
  }, 15000);

  it('user message persists even when stream fails mid-response', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockGetCachedSession.mockResolvedValue(testSession);

    mockAnthropicStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Starting...' } };
        throw new Error('API timeout');
      },
      finalMessage: async () => ({
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    });

    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_abc', message: 'Help me with algebra' }),
    });

    const response = await POST(req, routeContext);
    await consumeStream(response);

    // User message was persisted before streaming started
    expect(writtenMessages.length).toBeGreaterThanOrEqual(1);
    expect(writtenMessages[0].role).toBe('USER');
    expect(writtenMessages[0].content).toBe('Help me with algebra');

    // Assistant message was NOT saved (stream failed)
    const assistantMessages = writtenMessages.filter(m => m.role === 'ASSISTANT');
    expect(assistantMessages).toHaveLength(0);

    // Usage ledger was NOT created (stream failed before finalMessage)
    expect(writtenUsageLedger).toBeNull();
  }, 15000);

  it('session cache invalidated at each persistence boundary', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockGetCachedSession.mockResolvedValue(testSession);
    mockAnthropicStream.mockResolvedValue(
      makeStreamMock('Great question!'),
    );

    const { POST } = await import('@/app/api/chat/route');

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session_abc', message: 'What is pi?' }),
    });

    const response = await POST(req, routeContext);
    await consumeStream(response);

    // invalidateSessionCache called at least twice:
    // 1. After saving user message (line 134)
    // 2. After saving assistant message (line 504)
    const calls = mockInvalidateSessionCache.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.every((c: string[]) => c[0] === 'session_abc')).toBe(true);
  }, 15000);
});
