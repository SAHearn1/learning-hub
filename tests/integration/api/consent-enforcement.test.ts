import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockEnforceUsageLimits = vi.fn();

const mockDb = {
  topic: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  standard: {
    findFirst: vi.fn(),
  },
  assessment: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/usage-limits', () => ({
  enforceUsageLimits: mockEnforceUsageLimits,
  UsageLimitError: class extends Error {},
}));

vi.mock('@/lib/assessments/diagnostic-generator', () => ({
  generateDiagnosticQuestions: vi.fn().mockResolvedValue([
    {
      question: 'Test question',
      bloomsLevel: 'UNDERSTAND',
      difficulty: 2,
      type: 'multiple_choice',
      options: ['A', 'B'],
      correctAnswer: 'A',
      rubric: [],
      scaffoldHints: [],
    },
  ]),
}));

vi.mock('@/lib/irt/ability-estimation', () => ({
  getStudentAbility: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/irt/adaptive-selection', () => ({
  getRecommendedDifficultyRange: vi.fn().mockReturnValue({ optimal: 0 }),
}));

describe('minor consent enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceUsageLimits.mockResolvedValue(undefined);
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      isMinor: true,
      consentStatus: 'PENDING',
      student: { id: 'student_1', gradeLevel: 5 },
    });
  });

  it('blocks minor without granted consent from creating sessions', async () => {
    const { POST } = await import('@/app/api/sessions/route');
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', engagementMode: 'FORWARD' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });

  it('blocks minor without granted consent from starting pretests', async () => {
    const { POST } = await import('@/app/api/explore/pretest/route');
    const req = new NextRequest('http://localhost/api/explore/pretest', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH', gradeLevel: 5 }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockDb.session.create).not.toHaveBeenCalled();
  });
});
