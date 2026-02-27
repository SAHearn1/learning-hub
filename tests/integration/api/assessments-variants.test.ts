import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Auth mock ---
const mockRequireUser = vi.fn();

// --- Compliance mock ---
const mockHasRequiredMinorConsent = vi.fn().mockReturnValue(true);

// --- DB mocks ---
const mockSessionFindUnique = vi.fn();
const mockAssessmentCreate = vi.fn();
const mockAssessmentFindMany = vi.fn();
const mockTopicFindUnique = vi.fn();

// --- AI generation mocks ---
const mockGenerateDiagnosticQuestions = vi.fn();
const mockGenerateFormativeCheck = vi.fn();
const mockGenerateSummativeAssessment = vi.fn();
const mockUpdateProgress = vi.fn();
const mockCalculateMasteryScore = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    session: { findUnique: mockSessionFindUnique },
    assessment: { create: mockAssessmentCreate, findMany: mockAssessmentFindMany },
    topic: { findUnique: mockTopicFindUnique },
  },
}));
vi.mock('@/lib/assessments/diagnostic-generator', () => ({
  generateDiagnosticQuestions: mockGenerateDiagnosticQuestions,
}));
vi.mock('@/lib/assessments/formative-generator', () => ({
  generateFormativeCheck: mockGenerateFormativeCheck,
}));
vi.mock('@/lib/assessments/summative-generator', () => ({
  generateSummativeAssessment: mockGenerateSummativeAssessment,
  calculateMasteryScore: mockCalculateMasteryScore,
}));
vi.mock('@/lib/assessments/progress-calculator', () => ({
  updateProgress: mockUpdateProgress,
}));
vi.mock('@/lib/compliance', () => ({
  hasRequiredMinorConsent: mockHasRequiredMinorConsent,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };

const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  isMinor: false,
  consentStatus: 'GRANTED',
};

// Session owned by studentUser
const ownedSession = {
  id: 'sess_1',
  tenantId: 'tenant_1',
  subject: 'MATH',
  student: {
    id: 'stu_1',
    userId: 'user_stu',
    gradeLevel: 5,
    user: { id: 'user_stu', tenantId: 'tenant_1' },
  },
};

function makeQuestion(overrides = {}) {
  return {
    question: 'What is 2+2?',
    bloomsLevel: 'REMEMBER',
    difficulty: 2,
    type: 'MULTIPLE_CHOICE',
    options: ['2', '3', '4', '5'],
    correctAnswer: '4',
    rubric: '',
    scaffoldHints: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// POST /api/assessments/diagnostic
// ---------------------------------------------------------------------------
describe('POST /api/assessments/diagnostic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', sessionId: 'sess_1', subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body (missing sessionId)', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', sessionId: 'sess_missing', subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when STUDENT accesses another student\'s session', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, id: 'user_other' });
    mockSessionFindUnique.mockResolvedValue(ownedSession);
    const { POST } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', sessionId: 'sess_1', subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('creates diagnostic assessments and returns 200 on success', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(ownedSession);
    const questions = Array.from({ length: 5 }, (_, i) => makeQuestion({ question: `Q${i}` }));
    mockGenerateDiagnosticQuestions.mockResolvedValue(questions);
    let callIdx = 0;
    mockAssessmentCreate.mockImplementation(() =>
      Promise.resolve({ id: `assess_${callIdx++}`, sessionId: 'sess_1' })
    );

    const { POST } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', sessionId: 'sess_1', subject: 'MATH', gradeLevel: 5 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(5);
    expect(body.message).toMatch(/diagnostic assessment created/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/assessments/diagnostic
// ---------------------------------------------------------------------------
describe('GET /api/assessments/diagnostic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { GET } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic?sessionId=sess_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when neither studentId nor sessionId is provided', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns filtered assessments for authenticated student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockAssessmentFindMany.mockResolvedValue([
      {
        id: 'assess_1',
        session: {
          tenantId: 'tenant_1',
          student: { userId: 'user_stu', user: { firstName: 'A', lastName: 'B' } },
        },
      },
    ]);
    const { GET } = await import('@/app/api/assessments/diagnostic/route');
    const req = new NextRequest('http://localhost/api/assessments/diagnostic?sessionId=sess_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/assessments/formative
// ---------------------------------------------------------------------------
describe('POST /api/assessments/formative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/assessments/formative/route');
    const req = new NextRequest('http://localhost/api/assessments/formative', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1', currentTopic: 'Addition' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/assessments/formative/route');
    const req = new NextRequest('http://localhost/api/assessments/formative', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }), // missing currentTopic
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/assessments/formative/route');
    const req = new NextRequest('http://localhost/api/assessments/formative', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_missing', currentTopic: 'Addition' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('creates formative check and returns 200 on success', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(ownedSession);
    const question = makeQuestion();
    mockGenerateFormativeCheck.mockResolvedValue(question);
    mockAssessmentCreate.mockResolvedValue({ id: 'form_1', sessionId: 'sess_1', type: 'FORMATIVE' });

    const { POST } = await import('@/app/api/assessments/formative/route');
    const req = new NextRequest('http://localhost/api/assessments/formative', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1', currentTopic: 'Addition' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.assessment.id).toBe('form_1');
  });

  it('returns 403 for STUDENT accessing another student session', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, id: 'user_other' });
    mockSessionFindUnique.mockResolvedValue(ownedSession);
    const { POST } = await import('@/app/api/assessments/formative/route');
    const req = new NextRequest('http://localhost/api/assessments/formative', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1', currentTopic: 'Addition' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/assessments/summative
// ---------------------------------------------------------------------------
describe('POST /api/assessments/summative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/assessments/summative/route');
    const req = new NextRequest('http://localhost/api/assessments/summative', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'stu_1', sessionId: 'sess_1',
        topicName: 'Addition', learningObjectives: ['Add numbers'],
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/assessments/summative/route');
    const req = new NextRequest('http://localhost/api/assessments/summative', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', sessionId: 'sess_1' }), // missing topicName, learningObjectives
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/assessments/summative/route');
    const req = new NextRequest('http://localhost/api/assessments/summative', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'stu_1', sessionId: 'sess_missing',
        topicName: 'Addition', learningObjectives: ['Add numbers'],
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('creates summative assessment and returns 200 on success', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue({
      ...ownedSession,
      student: { ...ownedSession.student, gradeLevel: 5, userId: 'user_stu' },
    });
    mockTopicFindUnique.mockResolvedValue(null);
    const questions = Array.from({ length: 8 }, (_, i) => makeQuestion({ question: `Q${i}` }));
    mockGenerateSummativeAssessment.mockResolvedValue(questions);
    let callIdx = 0;
    mockAssessmentCreate.mockImplementation(() =>
      Promise.resolve({ id: `summ_${callIdx++}`, sessionId: 'sess_1', type: 'SUMMATIVE' })
    );

    const { POST } = await import('@/app/api/assessments/summative/route');
    const req = new NextRequest('http://localhost/api/assessments/summative', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'stu_1',
        sessionId: 'sess_1',
        topicName: 'Fractions',
        learningObjectives: ['Understand fractions', 'Add fractions'],
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.assessments).toHaveLength(8);
  });

  it('returns 403 when STUDENT accesses another student session', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, id: 'user_other' });
    mockSessionFindUnique.mockResolvedValue(ownedSession);
    const { POST } = await import('@/app/api/assessments/summative/route');
    const req = new NextRequest('http://localhost/api/assessments/summative', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'stu_1', sessionId: 'sess_1',
        topicName: 'Addition', learningObjectives: ['Add numbers'],
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('GET returns 400 when no filter params provided', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/assessments/summative/route');
    const req = new NextRequest('http://localhost/api/assessments/summative');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });
});
