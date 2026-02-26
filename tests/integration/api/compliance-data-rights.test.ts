import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockUserFindUnique = vi.fn();
const mockCanManageMinorConsent = vi.fn();
const mockRequiresGuardianForDataRequest = vi.fn();
const mockAppendAuditLog = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock('@/lib/compliance', () => ({
  canManageMinorConsent: mockCanManageMinorConsent,
  requiresGuardianForDataRequest: mockRequiresGuardianForDataRequest,
}));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAppendAuditLog }));
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

// ─── Fixtures ───────────────────────────────────────────────────────────────

const adminUser = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'PLATFORM_ADMIN',
};

const studentSubject = {
  id: 'user_stu',
  email: 'student@school.edu',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'STUDENT',
  isMinor: false,
  consentStatus: 'GRANTED',
  tenantId: 'tenant_1',
  createdAt: new Date().toISOString(),
  student: {
    sessions: [
      {
        messages: [{ id: 'm1' }, { id: 'm2' }],
        assessments: [],
      },
    ],
    progress: [],
  },
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/compliance/data-rights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/compliance/data-rights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
    mockCanManageMinorConsent.mockReturnValue(true);
    mockRequiresGuardianForDataRequest.mockReturnValue(false);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(makeRequest({ requestType: 'EXPORT' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid requestType', async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(makeRequest({ requestType: 'INVALID_TYPE' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when subject user not found', async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockUserFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(
      makeRequest({ requestType: 'EXPORT', subjectUserId: 'nonexistent_id' }),
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when cross-tenant access attempted', async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockUserFindUnique.mockResolvedValue({
      ...studentSubject,
      tenantId: 'tenant_OTHER',
    });
    mockCanManageMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(
      makeRequest({ requestType: 'EXPORT', subjectUserId: 'user_stu' }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when requesting minor data without guardian role', async () => {
    const regularUser = { id: 'user_regular', tenantId: 'tenant_1', role: 'EDUCATOR' };
    mockRequireUser.mockResolvedValue(regularUser);
    mockUserFindUnique.mockResolvedValue({ ...studentSubject, isMinor: true });
    mockCanManageMinorConsent.mockReturnValue(false);
    mockRequiresGuardianForDataRequest.mockReturnValue(true);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(
      makeRequest({ requestType: 'EXPORT', subjectUserId: 'user_stu' }),
    );
    expect(res.status).toBe(403);
  });

  it('returns EXPORT data for valid admin request', async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockUserFindUnique.mockResolvedValue(studentSubject);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(
      makeRequest({ requestType: 'EXPORT', subjectUserId: 'user_stu' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.export).toBeDefined();
    expect(body.export.subject.id).toBe('user_stu');
    expect(body.export.learningDataSummary.totalSessions).toBe(1);
    expect(body.export.learningDataSummary.totalMessages).toBe(2);
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_RIGHTS_REQUESTED' }),
    );
  });

  it('returns QUEUED status for DELETE request', async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockUserFindUnique.mockResolvedValue(studentSubject);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    const res = await POST(
      makeRequest({ requestType: 'DELETE', subjectUserId: 'user_stu' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('QUEUED');
    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_RIGHTS_REQUESTED' }),
    );
  });

  it('user can export their own data without admin role', async () => {
    const selfUser = { id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT' };
    mockRequireUser.mockResolvedValue(selfUser);
    mockUserFindUnique.mockResolvedValue(studentSubject);
    const { POST } = await import('@/app/api/compliance/data-rights/route');

    // subjectUserId defaults to actor.id when omitted
    const res = await POST(makeRequest({ requestType: 'EXPORT' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.export).toBeDefined();
  });
});
