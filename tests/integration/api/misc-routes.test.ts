import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockRequireRole = vi.fn();
const mockGenerateComplianceSnapshot = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/compliance-dashboard', () => ({
  generateComplianceSnapshot: mockGenerateComplianceSnapshot,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    student: {
      create: vi.fn(),
    },
    educator: {
      create: vi.fn(),
    },
    parent: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Clerk so onboarding/role does not reach out to real API
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      updateUserMetadata: vi.fn().mockResolvedValue({}),
    },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

// Bypass per-route rate limiting so test suite doesn't hit 429 after 5 calls
vi.mock('@/lib/api-handler', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-handler')>();
  return {
    ...actual,
    withApiHandler: (handler: any, _opts?: any) => actual.withApiHandler(handler),
  };
});

const routeContext = { params: Promise.resolve({}) };

const schoolAdminUser = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

const newUser = {
  id: 'user_new',
  clerkUserId: 'clerk_new',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  student: null,
  educator: null,
  parent: null,
};

const parentUser = {
  id: 'user_parent',
  clerkUserId: 'clerk_parent',
  tenantId: 'tenant_1',
  role: 'PARENT',
  parent: {
    id: 'parent_1',
    childrenIds: ['existing_child'],
  },
};

// ─── GET /api/compliance-dashboard ───────────────────────────────────────────

describe('GET /api/compliance-dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/compliance-dashboard/route');
    const res = await GET(new NextRequest('http://localhost/api/compliance-dashboard'), routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());

    const { GET } = await import('@/app/api/compliance-dashboard/route');
    const res = await GET(new NextRequest('http://localhost/api/compliance-dashboard'), routeContext);
    expect(res.status).toBe(403);
  });

  it('returns compliance snapshot for school admin', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const mockSnapshot = {
      iepCompliance: 92,
      evaluationTimeliness: 88,
      disciplineRate: 3.2,
      consentRate: 95,
    };
    mockGenerateComplianceSnapshot.mockResolvedValue(mockSnapshot);

    const { GET } = await import('@/app/api/compliance-dashboard/route');
    const res = await GET(new NextRequest('http://localhost/api/compliance-dashboard'), routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual(mockSnapshot);
    expect(mockGenerateComplianceSnapshot).toHaveBeenCalledWith('tenant_1');
  });

  it('scopes snapshot to the authenticated user tenantId', async () => {
    mockRequireRole.mockResolvedValue({ ...schoolAdminUser, tenantId: 'tenant_other' });
    mockGenerateComplianceSnapshot.mockResolvedValue({});

    const { GET } = await import('@/app/api/compliance-dashboard/route');
    await GET(new NextRequest('http://localhost/api/compliance-dashboard'), routeContext);

    expect(mockGenerateComplianceSnapshot).toHaveBeenCalledWith('tenant_other');
  });
});

// ─── POST /api/onboarding/role ────────────────────────────────────────────────

describe('POST /api/onboarding/role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'STUDENT' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid role value', async () => {
    mockRequireUser.mockResolvedValue(newUser);

    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'SUPERVILLAIN' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('sets STUDENT role and creates student profile when missing', async () => {
    mockRequireUser.mockResolvedValue({ ...newUser, student: null });
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.update).mockResolvedValue({ id: 'user_new', role: 'STUDENT' } as any);
    vi.mocked(db.student.create).mockResolvedValue({ id: 'student_new' } as any);

    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'STUDENT', gradeLevel: 7 }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.role).toBe('STUDENT');
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'STUDENT' } }),
    );
    expect(db.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user_new', gradeLevel: 7 }),
      }),
    );
  });

  it('sets EDUCATOR role and creates educator profile when missing', async () => {
    mockRequireUser.mockResolvedValue({ ...newUser, educator: null });
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.update).mockResolvedValue({ id: 'user_new', role: 'EDUCATOR' } as any);
    vi.mocked(db.educator.create).mockResolvedValue({ id: 'educator_new' } as any);

    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'EDUCATOR' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    expect(db.educator.create).toHaveBeenCalled();
  });

  it('sets PARENT role and creates parent profile when missing', async () => {
    mockRequireUser.mockResolvedValue({ ...newUser, parent: null });
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.update).mockResolvedValue({ id: 'user_new', role: 'PARENT' } as any);
    vi.mocked(db.parent.create).mockResolvedValue({ id: 'parent_new' } as any);

    const { POST } = await import('@/app/api/onboarding/role/route');
    const req = new NextRequest('http://localhost/api/onboarding/role', {
      method: 'POST',
      body: JSON.stringify({ role: 'PARENT' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    expect(db.parent.create).toHaveBeenCalled();
  });
});

// ─── POST /api/parent/children/link ──────────────────────────────────────────

describe('POST /api/parent/children/link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/parent/children/link/route');
    const req = new NextRequest('http://localhost/api/parent/children/link', {
      method: 'POST',
      body: JSON.stringify({ studentEmail: 'student@school.edu' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not a PARENT', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_educator', role: 'EDUCATOR', parent: null });

    const { POST } = await import('@/app/api/parent/children/link/route');
    const req = new NextRequest('http://localhost/api/parent/children/link', {
      method: 'POST',
      body: JSON.stringify({ studentEmail: 'student@school.edu' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentEmail is not a valid email', async () => {
    mockRequireUser.mockResolvedValue(parentUser);

    const { POST } = await import('@/app/api/parent/children/link/route');
    const req = new NextRequest('http://localhost/api/parent/children/link', {
      method: 'POST',
      body: JSON.stringify({ studentEmail: 'not-an-email' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when no student account exists for the email', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findFirst).mockResolvedValue(null);

    const { POST } = await import('@/app/api/parent/children/link/route');
    const req = new NextRequest('http://localhost/api/parent/children/link', {
      method: 'POST',
      body: JSON.stringify({ studentEmail: 'ghost@school.edu' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('links a student and returns linked student info', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: 'student_new',
      firstName: 'Alex',
      lastName: 'Kim',
    } as any);
    vi.mocked(db.parent.update).mockResolvedValue({ id: 'parent_1' } as any);

    const { POST } = await import('@/app/api/parent/children/link/route');
    const req = new NextRequest('http://localhost/api/parent/children/link', {
      method: 'POST',
      body: JSON.stringify({ studentEmail: 'alex@school.edu' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.linked).toBe(true);
    expect(body.data.student.id).toBe('student_new');
    expect(body.data.student.firstName).toBe('Alex');
    expect(db.parent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'parent_1' },
        data: { childrenIds: { push: 'student_new' } },
      }),
    );
  });

  it('returns 400 when student is already linked', async () => {
    // Parent already has 'existing_child' in their childrenIds
    mockRequireUser.mockResolvedValue(parentUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: 'existing_child',
      firstName: 'Sam',
      lastName: 'Jones',
    } as any);

    const { POST } = await import('@/app/api/parent/children/link/route');
    const req = new NextRequest('http://localhost/api/parent/children/link', {
      method: 'POST',
      body: JSON.stringify({ studentEmail: 'sam@school.edu' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });
});
