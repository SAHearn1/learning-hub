import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockUserUpdate = vi.fn();
const mockStudentUpdate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockStudentCreate = vi.fn();
const mockEducatorCreate = vi.fn();
const mockParentCreate = vi.fn();
const mockAppendAuditLog = vi.fn();
const mockClerkUpdateUserMetadata = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    user: { update: mockUserUpdate, findUnique: mockUserFindUnique },
    student: { update: mockStudentUpdate, create: mockStudentCreate },
    educator: { create: mockEducatorCreate },
    parent: { create: mockParentCreate },
  },
}));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAppendAuditLog }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: { updateUserMetadata: mockClerkUpdateUserMetadata },
  }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const routeCtx = { params: Promise.resolve({}) };

const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  firstName: 'Alice',
  lastName: 'Smith',
  clerkUserId: 'clerk_stu_1',
  student: {
    id: 'stu_1',
    learningPreferences: {
      preferredSubjects: ['MATH'],
      pace: 'GUIDED',
      accessibility: { textToSpeech: false, dyslexicFont: false, highContrast: false },
    },
    regulationProfile: {
      calmingStrategies: ['Deep breathing'],
      preferredBreakDuration: 5,
    },
  },
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
  clerkUserId: 'clerk_edu_1',
  student: null,
  educator: null,
  parent: null,
};

// ─── GET /api/student/settings ───────────────────────────────────────────────

describe('GET /api/student/settings', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    mockRequireUser.mockResolvedValue({ ...educatorUser, student: null });
    const { GET } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns 403 when STUDENT role but no student profile', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, role: 'STUDENT', student: null });
    const { GET } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns normalized settings for authenticated STUDENT', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.firstName).toBe('Alice');
    expect(body.data.lastName).toBe('Smith');
    expect(body.data.learningPreferences.pace).toBe('GUIDED');
    expect(body.data.learningPreferences.accessibility).toEqual({
      textToSpeech: false,
      dyslexicFont: false,
      highContrast: false,
    });
    expect(body.data.regulationProfile.calmingStrategies).toContain('Deep breathing');
  });
});

// ─── PATCH /api/student/settings ─────────────────────────────────────────────

describe('PATCH /api/student/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { PATCH } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Bob' }),
    });
    const res = await PATCH(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'PARENT', student: null });
    const { PATCH } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Bob' }),
    });
    const res = await PATCH(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid learningPreferences payload', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { PATCH } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        learningPreferences: { preferredSubjects: ['INVALID_SUBJECT'] },
      }),
    });
    const res = await PATCH(req, routeCtx);
    expect(res.status).toBe(400);
  });

  it('updates name fields and returns updated settings on success', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockUserUpdate.mockResolvedValue({});
    mockUserFindUnique.mockResolvedValue({
      id: 'user_stu',
      tenantId: 'tenant_1',
      firstName: 'Alicia',
      lastName: 'Smith',
      student: {
        id: 'stu_1',
        learningPreferences: studentUser.student.learningPreferences,
        regulationProfile: studentUser.student.regulationProfile,
      },
    });
    const { PATCH } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Alicia' }),
    });
    const res = await PATCH(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.firstName).toBe('Alicia');
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STUDENT_SETTINGS_UPDATED' }),
    );
  });

  it('updates regulation profile and returns 200', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentUpdate.mockResolvedValue({});
    mockUserFindUnique.mockResolvedValue({
      id: 'user_stu',
      tenantId: 'tenant_1',
      firstName: 'Alice',
      lastName: 'Smith',
      student: {
        id: 'stu_1',
        learningPreferences: studentUser.student.learningPreferences,
        regulationProfile: {
          calmingStrategies: ['Box breathing'],
          preferredBreakDuration: 10,
        },
      },
    });
    const { PATCH } = await import('@/app/api/student/settings/route');
    const req = new NextRequest('http://localhost/api/student/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        regulationProfile: { calmingStrategies: ['Box breathing'], preferredBreakDuration: 10 },
      }),
    });
    const res = await PATCH(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.regulationProfile.preferredBreakDuration).toBe(10);
  });
});

// ─── POST /api/regulate/check-in ─────────────────────────────────────────────

describe('POST /api/regulate/check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/regulate/check-in/route');
    const req = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      body: JSON.stringify({ mood: 3, energy: 3, selectedStrategy: 'Deep breathing' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    mockRequireUser.mockResolvedValue({ ...educatorUser, student: null });
    const { POST } = await import('@/app/api/regulate/check-in/route');
    const req = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      body: JSON.stringify({ mood: 3, energy: 3, selectedStrategy: 'Deep breathing' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing required fields', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/regulate/check-in/route');
    const req = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      body: JSON.stringify({ mood: 3 }), // missing energy and selectedStrategy
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(400);
  });

  it('returns 400 for out-of-range mood value', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/regulate/check-in/route');
    const req = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      body: JSON.stringify({ mood: 6, energy: 3, selectedStrategy: 'Walk' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(400);
  });

  it('creates check-in and returns calm recommendation when mood and energy are high', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/regulate/check-in/route');
    const req = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      body: JSON.stringify({ mood: 4, energy: 5, selectedStrategy: 'Music' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.recommendation).toContain('focused work block');
    expect(body.data.nextSteps).toContain('/learn');
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REGULATION_CHECK_IN' }),
    );
  });

  it('returns break recommendation when mood is low', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/regulate/check-in/route');
    const req = new NextRequest('http://localhost/api/regulate/check-in', {
      method: 'POST',
      body: JSON.stringify({ mood: 1, energy: 3, selectedStrategy: 'Deep breathing' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.recommendation).toContain('longer break');
  });
});

// ─── POST /api/onboarding/role ────────────────────────────────────────────────

describe('POST /api/onboarding/role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserUpdate.mockResolvedValue({});
    mockStudentCreate.mockResolvedValue({ id: 'stu_new' });
    mockEducatorCreate.mockResolvedValue({ id: 'edu_new' });
    mockParentCreate.mockResolvedValue({ id: 'par_new' });
    mockClerkUpdateUserMetadata.mockResolvedValue({});
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'STUDENT', gradeLevel: 5 }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid role value', async () => {
    mockRequireUser.mockResolvedValue({ ...educatorUser, student: null, educator: null, parent: null });
    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(400);
  });

  it('assigns STUDENT role, creates student profile, and updates Clerk metadata', async () => {
    const newUser = { ...educatorUser, student: null, educator: null, parent: null };
    mockRequireUser.mockResolvedValue(newUser);
    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'STUDENT', gradeLevel: 7 }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role).toBe('STUDENT');
    expect(mockStudentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gradeLevel: 7 }) }),
    );
    expect(mockClerkUpdateUserMetadata).toHaveBeenCalledWith(
      'clerk_edu_1',
      expect.objectContaining({ publicMetadata: { role: 'STUDENT', onboardingComplete: true } }),
    );
  });

  it('assigns EDUCATOR role and creates educator profile', async () => {
    const newUser = { ...educatorUser, student: null, educator: null, parent: null };
    mockRequireUser.mockResolvedValue(newUser);
    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'EDUCATOR' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    expect(mockEducatorCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_edu' }) }),
    );
  });

  it('assigns PARENT role and creates parent profile', async () => {
    const newUser = { ...educatorUser, student: null, educator: null, parent: null };
    mockRequireUser.mockResolvedValue(newUser);
    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'PARENT' }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    expect(mockParentCreate).toHaveBeenCalled();
    const body = await res.json();
    expect(body.data.role).toBe('PARENT');
  });

  it('skips student profile creation when student profile already exists', async () => {
    // User already has a student profile — the route should skip create.
    // The route has a rate limit of 5 per minute; to avoid hitting it after the
    // previous tests in this describe block we use a different IP on the request.
    const newUser = { ...educatorUser, student: { id: 'stu_existing' }, educator: null, parent: null };
    mockRequireUser.mockResolvedValue(newUser);
    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.99' },
      body: JSON.stringify({ role: 'STUDENT', gradeLevel: 5 }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(200);
    // student already exists — create should not be called
    expect(mockStudentCreate).not.toHaveBeenCalled();
  });
});
