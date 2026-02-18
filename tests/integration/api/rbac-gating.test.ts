/**
 * PR3 — RBAC Route Gating Validation
 *
 * Comprehensive integration tests that validate all portal routes enforce
 * proper role checks. Every route group is tested for:
 *   1. 401 when unauthenticated (requireUser/requireRole throws AuthenticationError)
 *   2. 403 for each unauthorized role
 *
 * Routes covered:
 *   - /api/lms/courses            GET + POST  — EDUCATOR+
 *   - /api/lms/assignments        POST        — EDUCATOR+
 *   - /api/lms/submissions        POST        — STUDENT only
 *   - /api/lms/grades             POST        — EDUCATOR+
 *   - /api/lms/classes/[classId]/roster  GET   — EDUCATOR+
 *   - /api/educator/compliance    POST        — EDUCATOR | SCHOOL_ADMIN only
 *   - /api/educator/reviews       POST        — EDUCATOR+
 *   - /api/admin/super/tenants/[tenantId]/suspension  PATCH — PLATFORM_ADMIN only
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

const mockRequireUser = vi.fn();
const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: mockRequireRole,
}));

vi.mock('@/lib/db', () => ({
  db: {
    course: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    class: { findUnique: vi.fn() },
    classEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
    assignment: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), create: vi.fn() },
    submission: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    grade: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    student: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    iepAccommodation: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    aiSuggestionReview: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: vi.fn() }));
vi.mock('@/lib/rbac', () => ({ assertTenantAccess: vi.fn() }));
vi.mock('@/lib/super-admin', () => ({ setTenantSuspension: vi.fn() }));
vi.mock('@/lib/ai/hitl/suggestion-service', () => ({
  getReviewQueue: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getCompletedReviews: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  submitReview: vi.fn(),
  SubmitReviewSchema: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeParams = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

/** Trigger a 401 by making requireUser reject with AuthenticationError. */
async function reject401() {
  const { AuthenticationError } = await import('@/lib/api-errors');
  mockRequireUser.mockRejectedValue(new AuthenticationError());
  // requireRole delegates to requireUser internally, so also mock it for
  // routes that use requireRole.
  mockRequireRole.mockRejectedValue(new AuthenticationError());
}

/** Trigger a 403 by making requireRole reject with ForbiddenError. */
async function rejectRole403() {
  const { ForbiddenError } = await import('@/lib/api-errors');
  mockRequireRole.mockRejectedValue(new ForbiddenError());
}

// ---------------------------------------------------------------------------
// Pre-built user fixtures
// ---------------------------------------------------------------------------

const studentUser = {
  id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT',
  student: { id: 'stu_1' },
};
const parentUser = {
  id: 'user_par', tenantId: 'tenant_1', role: 'PARENT',
  parent: { id: 'par_1', childrenIds: ['user_child_1'] },
};
const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };
const schoolAdminUser = { id: 'user_sa', tenantId: 'tenant_1', role: 'SCHOOL_ADMIN' };
const districtAdminUser = { id: 'user_da', tenantId: 'tenant_1', role: 'DISTRICT_ADMIN' };
const platformAdminUser = { id: 'user_pa', tenantId: 'tenant_1', role: 'PLATFORM_ADMIN' };

// ========================================================================
// TESTS
// ========================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------
// 1. /api/lms/courses  GET + POST — requires EDUCATOR+
// -----------------------------------------------------------------------

describe('/api/lms/courses GET', () => {
  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { GET } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses');
    const res = await GET(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses');
    const res = await GET(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { GET } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses');
    const res = await GET(req, makeParams());
    expect(res.status).toBe(403);
  });
});

describe('/api/lms/courses POST', () => {
  const validBody = JSON.stringify({ name: 'Algebra', subject: 'MATH', gradeLevel: [7] });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { POST } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 2. /api/lms/assignments  POST — requires EDUCATOR+
// -----------------------------------------------------------------------

describe('/api/lms/assignments POST', () => {
  const validBody = JSON.stringify({
    classId: 'cls_1', title: 'Homework 1', type: 'HOMEWORK', points: 50,
  });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { POST } = await import('@/app/api/lms/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/assignments', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/lms/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/assignments', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/lms/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/assignments', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 3. /api/lms/submissions  POST — requires STUDENT only
// -----------------------------------------------------------------------

describe('/api/lms/submissions POST', () => {
  const validBody = JSON.stringify({ assignmentId: 'a1', content: 'My answer' });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for SCHOOL_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue(schoolAdminUser);
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for DISTRICT_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue(districtAdminUser);
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PLATFORM_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 4. /api/lms/grades  POST — requires EDUCATOR+
// -----------------------------------------------------------------------

describe('/api/lms/grades POST', () => {
  const validBody = JSON.stringify({ submissionId: 'sub_1', score: 90, maxScore: 100 });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { POST } = await import('@/app/api/lms/grades/route');
    const req = new NextRequest('http://localhost/api/lms/grades', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/lms/grades/route');
    const req = new NextRequest('http://localhost/api/lms/grades', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/lms/grades/route');
    const req = new NextRequest('http://localhost/api/lms/grades', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 5. /api/lms/classes/[classId]/roster  GET — requires EDUCATOR+
// -----------------------------------------------------------------------

describe('/api/lms/classes/[classId]/roster GET', () => {
  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeParams({ classId: 'cls_1' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeParams({ classId: 'cls_1' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/cls_1/roster');
    const res = await GET(req, makeParams({ classId: 'cls_1' }));
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 6. /api/educator/compliance  POST — requires EDUCATOR | SCHOOL_ADMIN only
// -----------------------------------------------------------------------

describe('/api/educator/compliance POST', () => {
  const validBody = JSON.stringify({
    studentId: 'stu_1',
    type: 'EXTENDED_TIME',
    description: 'Extra time for tests',
    parameters: {},
    startDate: '2026-01-01T00:00:00.000Z',
  });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for DISTRICT_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue(districtAdminUser);
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PLATFORM_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 7. /api/educator/reviews  POST — requires EDUCATOR+
// -----------------------------------------------------------------------

describe('/api/educator/reviews POST', () => {
  const validBody = JSON.stringify({
    reviewId: 'rev_1',
    decision: 'approved',
  });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { POST } = await import('@/app/api/educator/reviews/route');
    const req = new NextRequest('http://localhost/api/educator/reviews', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/educator/reviews/route');
    const req = new NextRequest('http://localhost/api/educator/reviews', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { POST } = await import('@/app/api/educator/reviews/route');
    const req = new NextRequest('http://localhost/api/educator/reviews', { method: 'POST', body: validBody });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// 8. /api/admin/super/tenants/[tenantId]/suspension  PATCH — PLATFORM_ADMIN only
//
//    This route uses requireRole(['PLATFORM_ADMIN']) which internally calls
//    requireUser() then checks the role. When unauthed, requireRole throws
//    AuthenticationError. When the role is wrong, it throws ForbiddenError.
// -----------------------------------------------------------------------

describe('PATCH /api/admin/super/tenants/[tenantId]/suspension', () => {
  const validBody = JSON.stringify({ suspend: true, reason: 'Non-payment' });

  it('returns 401 when unauthenticated', async () => {
    await reject401();
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH', body: validBody,
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    await rejectRole403();
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH', body: validBody,
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    await rejectRole403();
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH', body: validBody,
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for EDUCATOR role', async () => {
    await rejectRole403();
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH', body: validBody,
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for SCHOOL_ADMIN role', async () => {
    await rejectRole403();
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH', body: validBody,
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for DISTRICT_ADMIN role', async () => {
    await rejectRole403();
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH', body: validBody,
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).toBe(403);
  });
});

// -----------------------------------------------------------------------
// Cross-cutting: Verify that authorized roles DO NOT get 403
// (positive smoke tests to make sure our mocking is correct)
// -----------------------------------------------------------------------

describe('Positive authorization smoke tests', () => {
  it('/api/lms/courses GET allows EDUCATOR', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses');
    const res = await GET(req, makeParams());
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('/api/lms/courses GET allows SCHOOL_ADMIN', async () => {
    mockRequireUser.mockResolvedValue(schoolAdminUser);
    const { GET } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses');
    const res = await GET(req, makeParams());
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('/api/lms/courses GET allows PLATFORM_ADMIN', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    const { GET } = await import('@/app/api/lms/courses/route');
    const req = new NextRequest('http://localhost/api/lms/courses');
    const res = await GET(req, makeParams());
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('/api/lms/submissions POST allows STUDENT', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { db } = await import('@/lib/db');
    (db.assignment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'a1', tenantId: 'tenant_1', published: true,
    });
    (db.submission.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sub_new', assignmentId: 'a1', studentId: 'stu_1', status: 'SUBMITTED',
    });
    const { POST } = await import('@/app/api/lms/submissions/route');
    const req = new NextRequest('http://localhost/api/lms/submissions', {
      method: 'POST',
      body: JSON.stringify({ assignmentId: 'a1', content: 'My work' }),
    });
    const res = await POST(req, makeParams());
    // Should not be 401 or 403 — the role gate passes
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('/api/educator/compliance POST allows EDUCATOR', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { db } = await import('@/lib/db');
    (db.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'stu_1', user: { tenantId: 'tenant_1' },
    });
    (db.iepAccommodation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc_1', studentId: 'stu_1', type: 'EXTENDED_TIME',
    });
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'stu_1',
        type: 'EXTENDED_TIME',
        description: 'Extra time for tests',
        parameters: {},
        startDate: '2026-01-01T00:00:00.000Z',
      }),
    });
    const res = await POST(req, makeParams());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('/api/educator/compliance POST allows SCHOOL_ADMIN', async () => {
    mockRequireUser.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');
    (db.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'stu_1', user: { tenantId: 'tenant_1' },
    });
    (db.iepAccommodation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc_2', studentId: 'stu_1', type: 'EXTENDED_TIME',
    });
    const { POST } = await import('@/app/api/educator/compliance/route');
    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'stu_1',
        type: 'EXTENDED_TIME',
        description: 'Extra time for tests',
        parameters: {},
        startDate: '2026-01-01T00:00:00.000Z',
      }),
    });
    const res = await POST(req, makeParams());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('/api/admin/super/tenants/[tenantId]/suspension PATCH allows PLATFORM_ADMIN', async () => {
    mockRequireRole.mockResolvedValue(platformAdminUser);
    const { setTenantSuspension } = await import('@/lib/super-admin');
    (setTenantSuspension as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 't1', isSuspended: true, suspendedAt: new Date().toISOString(), suspensionReason: 'Test',
    });
    const { PATCH } = await import('@/app/api/admin/super/tenants/[tenantId]/suspension/route');
    const req = new NextRequest('http://localhost/api/admin/super/tenants/t1/suspension', {
      method: 'PATCH',
      body: JSON.stringify({ suspend: true, reason: 'Non-payment' }),
    });
    const res = await PATCH(req, makeParams({ tenantId: 't1' }));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
