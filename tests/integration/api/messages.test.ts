import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockGetThreadsForUser = vi.fn();
const mockCreateThread = vi.fn();
const mockGetThread = vi.fn();
const mockSendMessage = vi.fn();
const mockMarkMessagesRead = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: vi.fn(),
}));

vi.mock('@/lib/messaging/messaging.service', () => ({
  getThreadsForUser: mockGetThreadsForUser,
  createThread: mockCreateThread,
  getThread: mockGetThread,
  sendMessage: mockSendMessage,
  markMessagesRead: mockMarkMessagesRead,
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

const routeContext = { params: Promise.resolve({ threadId: 'thread_1' }) };

const parentUser = {
  id: 'user_parent',
  tenantId: 'tenant_1',
  role: 'PARENT',
};

const educatorUser = {
  id: 'user_educator',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

// ─── GET /api/messages/threads ───────────────────────────────────────────────

describe('GET /api/messages/threads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns threads for authenticated user', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockGetThreadsForUser.mockResolvedValue([
      { id: 'thread_1', subject: 'Session concern', parentId: 'user_parent', educatorId: 'user_educator' },
      { id: 'thread_2', subject: 'Grade question', parentId: 'user_parent', educatorId: 'user_educator' },
    ]);

    const { GET } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(mockGetThreadsForUser).toHaveBeenCalledWith('user_parent');
  });

  it('returns empty array when user has no threads', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockGetThreadsForUser.mockResolvedValue([]);

    const { GET } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });
});

// ─── POST /api/messages/threads ──────────────────────────────────────────────

describe('POST /api/messages/threads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads', {
      method: 'POST',
      body: JSON.stringify({ studentId: 's1', educatorId: 'e1', subject: 'Test' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('creates a thread and returns 201 for a parent user', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const mockThread = {
      id: 'thread_new',
      subject: 'About homework',
      parentId: 'user_parent',
      educatorId: 'user_educator',
      tenantId: 'tenant_1',
    };
    mockCreateThread.mockResolvedValue(mockThread);

    const { POST } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'student_1',
        educatorId: 'user_educator',
        subject: 'About homework',
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.id).toBe('thread_new');
    expect(mockCreateThread).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        studentId: 'student_1',
        parentId: 'user_parent',
        subject: 'About homework',
      }),
    );
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireUser.mockResolvedValue(parentUser);

    const { POST } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads', {
      method: 'POST',
      body: JSON.stringify({ subject: 'Missing studentId and educatorId' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('sets educatorId as parentId when the caller is an EDUCATOR', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockCreateThread.mockResolvedValue({ id: 'thread_edu', subject: 'Progress update' });

    const { POST } = await import('@/app/api/messages/threads/route');
    const req = new NextRequest('http://localhost/api/messages/threads', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 'student_1',
        educatorId: 'user_educator',
        subject: 'Progress update',
      }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);

    expect(mockCreateThread).toHaveBeenCalledWith(
      expect.objectContaining({ educatorId: 'user_educator' }),
    );
  });
});

// ─── GET /api/messages/threads/[threadId] ────────────────────────────────────

describe('GET /api/messages/threads/[threadId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns the thread when user is a participant', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const mockThread = {
      id: 'thread_1',
      subject: 'Homework help',
      parentId: 'user_parent',
      educatorId: 'user_educator',
      messages: [],
    };
    mockGetThread.mockResolvedValue(mockThread);
    mockMarkMessagesRead.mockResolvedValue(undefined);

    const { GET } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBe('thread_1');
    expect(mockMarkMessagesRead).toHaveBeenCalledWith('thread_1', 'user_parent');
  });

  it('returns 404 when thread does not exist', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockGetThread.mockResolvedValue(null);

    const { GET } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_missing');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 404 when authenticated user is not a participant', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_other', tenantId: 'tenant_1', role: 'PARENT' });
    mockGetThread.mockResolvedValue({
      id: 'thread_1',
      parentId: 'user_parent',
      educatorId: 'user_educator',
    });

    const { GET } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/messages/threads/[threadId] (reply) ───────────────────────────

describe('POST /api/messages/threads/[threadId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_1', {
      method: 'POST',
      body: JSON.stringify({ body: 'Hello' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('sends a reply message and returns 201', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const mockMessage = { id: 'msg_new', threadId: 'thread_1', senderId: 'user_parent', body: 'Thanks!' };
    mockSendMessage.mockResolvedValue(mockMessage);

    const { POST } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_1', {
      method: 'POST',
      body: JSON.stringify({ body: 'Thanks!' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);

    const responseBody = await res.json();
    expect(responseBody.data.id).toBe('msg_new');
    expect(mockSendMessage).toHaveBeenCalledWith({
      threadId: 'thread_1',
      senderId: 'user_parent',
      body: 'Thanks!',
    });
  });

  it('returns 400 when body is empty or missing', async () => {
    mockRequireUser.mockResolvedValue(parentUser);

    const { POST } = await import('@/app/api/messages/threads/[threadId]/route');
    const req = new NextRequest('http://localhost/api/messages/threads/thread_1', {
      method: 'POST',
      body: JSON.stringify({ body: '' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });
});
