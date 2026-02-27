import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Auth mock ---
const mockRequireUser = vi.fn();

// --- Compliance mock ---
const mockHasRequiredMinorConsent = vi.fn().mockReturnValue(true);

// --- DB mocks ---
const mockTopicFindMany = vi.fn();
const mockSessionFindFirst = vi.fn();
const mockSessionCreate = vi.fn();
const mockSessionFindUnique = vi.fn();
const mockSessionUpdate = vi.fn();
const mockStandardFindFirst = vi.fn();
const mockAssessmentCreate = vi.fn();
const mockAssessmentFindMany = vi.fn();
const mockSessionDelete = vi.fn();

// --- Library mocks ---
const mockGetStudentAbility = vi.fn();
const mockGetRecommendedDifficultyRange = vi.fn();
const mockGenerateDiagnosticQuestions = vi.fn();
const mockCalculateTopicMastery = vi.fn();
const mockDetermineMasteryStatus = vi.fn();
const mockEnforceUsageLimits = vi.fn();
const mockEstimateAbilityEAP = vi.fn();
const mockUpdateStudentAbility = vi.fn();
const mockShouldStopAssessment = vi.fn();
const mockTrackEvent = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    topic: { findMany: mockTopicFindMany },
    session: {
      findFirst: mockSessionFindFirst,
      create: mockSessionCreate,
      findUnique: mockSessionFindUnique,
      update: mockSessionUpdate,
      delete: mockSessionDelete,
    },
    standard: { findFirst: mockStandardFindFirst },
    assessment: {
      create: mockAssessmentCreate,
      findMany: mockAssessmentFindMany,
    },
  },
}));
vi.mock('@/lib/assessments/diagnostic-generator', () => ({
  generateDiagnosticQuestions: mockGenerateDiagnosticQuestions,
}));
vi.mock('@/lib/assessments/progress-calculator', () => ({
  calculateTopicMastery: mockCalculateTopicMastery,
  determineMasteryStatus: mockDetermineMasteryStatus,
}));
vi.mock('@/lib/irt/ability-estimation', () => ({
  getStudentAbility: mockGetStudentAbility,
  estimateAbilityEAP: mockEstimateAbilityEAP,
  updateStudentAbility: mockUpdateStudentAbility,
}));
vi.mock('@/lib/irt/adaptive-selection', () => ({
  getRecommendedDifficultyRange: mockGetRecommendedDifficultyRange,
  shouldStopAssessment: mockShouldStopAssessment,
}));
vi.mock('@/lib/usage-limits', () => ({
  enforceUsageLimits: mockEnforceUsageLimits,
  UsageLimitError: class UsageLimitError extends Error { constructor(msg: string) { super(msg); } },
}));
vi.mock('@/lib/compliance', () => ({
  hasRequiredMinorConsent: mockHasRequiredMinorConsent,
}));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: mockTrackEvent,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/feature-flags', () => ({
  featureFlags: { strictRoleEnforcement: false },
}));

const routeContext = { params: Promise.resolve({}) };
const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  isMinor: false,
  consentStatus: 'GRANTED',
  student: { id: 'stu_1' },
};

// ---------------------------------------------------------------------------
// GET /api/explore/topics
// ---------------------------------------------------------------------------
describe('GET /api/explore/topics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
    mockDetermineMasteryStatus.mockReturnValue({
      status: 'NOT_STARTED',
      color: 'gray',
      description: 'Not yet assessed',
    });
    mockCalculateTopicMastery.mockResolvedValue({ overallMastery: 0 });
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/explore/topics/route');
    const req = new NextRequest('http://localhost/api/explore/topics?subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid subject param', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/explore/topics/route');
    const req = new NextRequest('http://localhost/api/explore/topics?subject=HISTORY');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when student profile is missing', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, student: null });
    const { GET } = await import('@/app/api/explore/topics/route');
    const req = new NextRequest('http://localhost/api/explore/topics?subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns topics sorted by mastery ascending', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const topics = [
      { id: 'top_1', name: 'Addition', subject: 'MATH', gradeLevel: [3], estimatedDuration: 30, description: '', standards: [] },
      { id: 'top_2', name: 'Fractions', subject: 'MATH', gradeLevel: [4], estimatedDuration: 45, description: '', standards: [] },
    ];
    mockTopicFindMany.mockResolvedValue(topics);
    mockCalculateTopicMastery
      .mockResolvedValueOnce({ overallMastery: 60 })
      .mockResolvedValueOnce({ overallMastery: 20 });
    mockDetermineMasteryStatus.mockReturnValue({ status: 'IN_PROGRESS', color: 'yellow', description: 'In progress' });

    const { GET } = await import('@/app/api/explore/topics/route');
    const req = new NextRequest('http://localhost/api/explore/topics?subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    // Weakest (mastery=20) should be first
    expect(body.data[0].mastery).toBe(20);
    expect(body.data[1].mastery).toBe(60);
  });

  it('returns empty list when no topics exist for subject', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockTopicFindMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/explore/topics/route');
    const req = new NextRequest('http://localhost/api/explore/topics?subject=FINANCIAL_LITERACY');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/explore/pretest
// ---------------------------------------------------------------------------
describe('POST /api/explore/pretest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
    mockEnforceUsageLimits.mockResolvedValue(undefined);
    mockSessionFindFirst.mockResolvedValue(null);
    mockGetStudentAbility.mockResolvedValue(null);
    mockGetRecommendedDifficultyRange.mockReturnValue({ optimal: 0, min: -1, max: 1 });
    mockStandardFindFirst.mockResolvedValue({ id: 'std_1' });
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true, consentStatus: 'PENDING' });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid subject', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'HISTORY', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 for out-of-range gradeLevel', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 0 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 409 when pretest already completed for subject', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindFirst.mockResolvedValue({
      id: 'sess_existing',
      metadata: { type: 'PRETEST', pretestCompleted: true },
    });
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(409);
  });

  it('creates session and returns first question on success', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const session = { id: 'sess_new', tenantId: 'tenant_1', studentId: 'stu_1' };
    mockSessionCreate.mockResolvedValue(session);
    const question = {
      question: 'What is 2+2?',
      bloomsLevel: 'REMEMBER',
      difficulty: 3,
      type: 'MULTIPLE_CHOICE',
      options: ['2', '3', '4', '5'],
      correctAnswer: '4',
      rubric: '',
      scaffoldHints: [],
    };
    mockGenerateDiagnosticQuestions.mockResolvedValue([question]);
    const assessment = { id: 'assess_1', sessionId: 'sess_new' };
    mockAssessmentCreate.mockResolvedValue(assessment);

    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.sessionId).toBe('sess_new');
    expect(body.data.assessment.id).toBe('assess_1');
    expect(body.data.questionsAnswered).toBe(0);
  });

  it('returns 404 when student profile is missing', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, student: null });
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/explore/pretest/next
// ---------------------------------------------------------------------------
describe('POST /api/explore/pretest/next', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
    mockEstimateAbilityEAP.mockReturnValue({ theta: 0, standardError: 0.5 });
    mockGetRecommendedDifficultyRange.mockReturnValue({ optimal: 0, min: -1, max: 1 });
    mockStandardFindFirst.mockResolvedValue({ id: 'std_1' });
    mockUpdateStudentAbility.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/explore/pretest/next/route');
    const req = new NextRequest('http://localhost/api/explore/pretest/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true, consentStatus: 'PENDING' });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/explore/pretest/next/route');
    const req = new NextRequest('http://localhost/api/explore/pretest/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 404 when session is not found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/explore/pretest/next/route');
    const req = new NextRequest('http://localhost/api/explore/pretest/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_missing' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when session belongs to different student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue({
      id: 'sess_1',
      studentId: 'stu_other',
      subject: 'MATH',
      metadata: { type: 'PRETEST', gradeLevel: 5 },
    });
    const { POST } = await import('@/app/api/explore/pretest/next/route');
    const req = new NextRequest('http://localhost/api/explore/pretest/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns done=true when stopping criterion is met', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue({
      id: 'sess_1',
      studentId: 'stu_1',
      subject: 'MATH',
      metadata: { type: 'PRETEST', gradeLevel: 5 },
    });
    mockAssessmentFindMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `a_${i}`,
        standardId: `std_${i}`,
        difficulty: 3,
        isCorrect: i % 2 === 0,
      }))
    );
    mockEstimateAbilityEAP.mockReturnValue({ theta: 0.5, standardError: 0.25 });
    mockShouldStopAssessment.mockReturnValue(true);
    mockSessionUpdate.mockResolvedValue({});

    const { POST } = await import('@/app/api/explore/pretest/next/route');
    const req = new NextRequest('http://localhost/api/explore/pretest/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.done).toBe(true);
    expect(body.data.questionsAnswered).toBe(5);
  });

  it('returns next question when assessment should continue', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue({
      id: 'sess_1',
      studentId: 'stu_1',
      subject: 'MATH',
      metadata: { type: 'PRETEST', gradeLevel: 5 },
    });
    mockAssessmentFindMany.mockResolvedValue([
      { id: 'a_1', standardId: 'std_1', difficulty: 3, isCorrect: true },
    ]);
    mockEstimateAbilityEAP.mockReturnValue({ theta: 0.2, standardError: 0.5 });
    mockShouldStopAssessment.mockReturnValue(false);
    const question = {
      question: 'Next question?',
      bloomsLevel: 'UNDERSTAND',
      difficulty: 3,
      type: 'MULTIPLE_CHOICE',
      options: [],
      correctAnswer: 'A',
      rubric: '',
      scaffoldHints: [],
    };
    mockGenerateDiagnosticQuestions.mockResolvedValue([question]);
    mockAssessmentCreate.mockResolvedValue({ id: 'a_new', sessionId: 'sess_1' });

    const { POST } = await import('@/app/api/explore/pretest/next/route');
    const req = new NextRequest('http://localhost/api/explore/pretest/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.done).toBe(false);
    expect(body.data.assessment.id).toBe('a_new');
  });
});
