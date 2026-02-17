import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockGenerateAIFeedback = vi.fn();
const mockUpdateProgress = vi.fn();
const mockSuggestPrerequisiteTopics = vi.fn();

const mockDb = {
  assessment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/assessments/ai-feedback-generator', () => ({
  generateAIFeedback: mockGenerateAIFeedback,
}));

vi.mock('@/lib/assessments/progress-calculator', () => ({
  updateProgress: mockUpdateProgress,
}));

vi.mock('@/lib/curriculum/prerequisite-graph', () => ({
  suggestPrerequisiteTopics: mockSuggestPrerequisiteTopics,
}));

describe('POST /api/assessments/[id]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuggestPrerequisiteTopics.mockReturnValue([]);
    mockGenerateAIFeedback.mockResolvedValue({
      isCorrect: true,
      score: 88,
      feedback: 'Nice work.',
      scaffoldHints: [],
      commonErrors: [],
      nextSteps: [],
    });
  });

  it('blocks minors without granted consent', { timeout: 15000 }, async () => {
    mockRequireUser.mockResolvedValue({
      id: 'student_user_1',
      role: 'STUDENT',
      tenantId: 'tenant_1',
      isMinor: true,
      consentStatus: 'PENDING',
    });

    const { POST } = await import('@/app/api/assessments/[id]/submit/route');
    const req = new NextRequest('http://localhost/api/assessments/a1/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentResponse: '42' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockDb.assessment.findUnique).not.toHaveBeenCalled();
  });

  it('submits assessment when authorized and consent is valid', async () => {
    mockRequireUser.mockResolvedValue({
      id: 'student_user_1',
      role: 'STUDENT',
      tenantId: 'tenant_1',
      isMinor: true,
      consentStatus: 'GRANTED',
    });
    mockDb.assessment.findUnique.mockResolvedValue({
      id: 'a1',
      question: 'What is 6 * 7?',
      bloomsLevel: 'APPLY',
      difficulty: 2,
      metadata: {},
      standardId: 'std_1',
      standard: { topics: [] },
      session: {
        studentId: 'student_1',
        student: {
          userId: 'student_user_1',
          user: { tenantId: 'tenant_1' },
        },
      },
    });
    mockDb.assessment.update.mockResolvedValue({
      id: 'a1',
      score: 88,
    });

    const { POST } = await import('@/app/api/assessments/[id]/submit/route');
    const req = new NextRequest('http://localhost/api/assessments/a1/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentResponse: '42', timeTaken: 30 }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      message: 'Assessment submitted successfully',
    });
    expect(mockDb.assessment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } }),
    );
    expect(mockGenerateAIFeedback).toHaveBeenCalled();
    expect(mockUpdateProgress).toHaveBeenCalled();
  });
});
