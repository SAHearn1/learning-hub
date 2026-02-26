import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockSessionFindUnique = vi.fn();
const mockSessionUpdate = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  getCurrentUser: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    session: {
      findUnique: mockSessionFindUnique,
      update: mockSessionUpdate,
    },
  },
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

// ─── Fixtures ───────────────────────────────────────────────────────────────

const SESSION_ID = 'session_abc123';

function routeCtx(sessionId = SESSION_ID) {
  return { params: Promise.resolve({ sessionId }) };
}

const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

const sessionRecord = {
  id: SESSION_ID,
  tenantId: 'tenant_1',
  startedAt: new Date().toISOString(),
  endedAt: null,
  messages: [],
  assessments: [],
  student: {
    id: 'stu_1',
    userId: 'user_stu',
    user: { id: 'user_stu', tenantId: 'tenant_1' },
  },
};

// ─── GET /api/sessions/[sessionId] ───────────────────────────────────────────

describe('GET /api/sessions/[sessionId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`);
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 404 when session does not exist', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`);
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(404);
  });

  it('returns 403 when student tries to access another student session', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, id: 'user_OTHER' });
    mockSessionFindUnique.mockResolvedValue(sessionRecord); // owned by user_stu
    const { GET } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`);
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(403);
  });

  it('returns session data for the owning student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(sessionRecord);
    const { GET } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`);
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(SESSION_ID);
  });

  it('returns 403 for educator from different tenant', async () => {
    mockRequireUser.mockResolvedValue({ ...educatorUser, tenantId: 'tenant_OTHER' });
    mockSessionFindUnique.mockResolvedValue(sessionRecord); // tenantId: tenant_1
    const { GET } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`);
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(403);
  });

  it('returns session data for educator in same tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser); // same tenant
    mockSessionFindUnique.mockResolvedValue(sessionRecord);
    const { GET } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`);
    const res = await GET(req, routeCtx());
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /api/sessions/[sessionId] ─────────────────────────────────────────

describe('PATCH /api/sessions/[sessionId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { PATCH } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentPhase: 'REGULATE' }),
    });
    const res = await PATCH(req, routeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 404 when session does not exist', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentPhase: 'REGULATE' }),
    });
    const res = await PATCH(req, routeCtx());
    expect(res.status).toBe(404);
  });

  it('updates session phase for owning student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue({
      ...sessionRecord,
      student: { userId: 'user_stu' },
    });
    mockSessionUpdate.mockResolvedValue({ ...sessionRecord, currentPhase: 'REGULATE' });
    const { PATCH } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentPhase: 'REGULATE' }),
    });
    const res = await PATCH(req, routeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.currentPhase).toBe('REGULATE');
  });
});

// ─── DELETE /api/sessions/[sessionId] ────────────────────────────────────────

describe('DELETE /api/sessions/[sessionId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { DELETE } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, routeCtx());
    expect(res.status).toBe(401);
  });

  it('soft-deletes session by setting endedAt for owning student', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockSessionFindUnique.mockResolvedValue({
      ...sessionRecord,
      student: { userId: 'user_stu' },
    });
    const endedAt = new Date().toISOString();
    mockSessionUpdate.mockResolvedValue({ ...sessionRecord, endedAt });
    const { DELETE } = await import('@/app/api/sessions/[sessionId]/route');

    const req = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, routeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/session ended/i);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ endedAt: expect.any(Date) }) }),
    );
  });
});
