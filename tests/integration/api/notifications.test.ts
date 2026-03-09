import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockGetNotifications = vi.fn();
const mockMarkAllRead = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkRead = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: vi.fn(),
}));

vi.mock('@/lib/notifications/notification.service', () => ({
  getNotifications: mockGetNotifications,
  markAllRead: mockMarkAllRead,
  getUnreadCount: mockGetUnreadCount,
  markRead: mockMarkRead,
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

const routeContext = { params: Promise.resolve({ notificationId: 'notif_1' }) };

const authenticatedUser = { id: 'user_1', tenantId: 'tenant_1', role: 'STUDENT' };

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns all notifications for authenticated user', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockGetNotifications.mockResolvedValue([
      { id: 'notif_1', message: 'Session completed', read: false },
      { id: 'notif_2', message: 'New assignment', read: true },
    ]);

    const { GET } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(mockGetNotifications).toHaveBeenCalledWith('user_1', false);
  });

  it('passes unreadOnly=true filter to service when query param is set', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockGetNotifications.mockResolvedValue([
      { id: 'notif_1', message: 'Session completed', read: false },
    ]);

    const { GET } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications?unreadOnly=true');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    expect(mockGetNotifications).toHaveBeenCalledWith('user_1', true);
  });

  it('returns empty array when user has no notifications', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockGetNotifications.mockResolvedValue([]);

    const { GET } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });
});

// ─── POST /api/notifications (markAllRead) ────────────────────────────────────

describe('POST /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ action: 'markAllRead' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('marks all notifications read and returns success', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockMarkAllRead.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ action: 'markAllRead' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockMarkAllRead).toHaveBeenCalledWith('user_1');
  });

  it('returns 400 for unknown action', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);

    const { POST } = await import('@/app/api/notifications/route');
    const req = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ action: 'unknownAction' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/notifications/count ────────────────────────────────────────────

describe('GET /api/notifications/count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/notifications/count/route');
    const req = new NextRequest('http://localhost/api/notifications/count');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns unread notification count for authenticated user', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockGetUnreadCount.mockResolvedValue(5);

    const { GET } = await import('@/app/api/notifications/count/route');
    const req = new NextRequest('http://localhost/api/notifications/count');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.count).toBe(5);
    expect(mockGetUnreadCount).toHaveBeenCalledWith('user_1');
  });

  it('returns count of 0 when user has no unread notifications', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockGetUnreadCount.mockResolvedValue(0);

    const { GET } = await import('@/app/api/notifications/count/route');
    const req = new NextRequest('http://localhost/api/notifications/count');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(0);
  });
});

// ─── POST /api/notifications/[notificationId]/read ───────────────────────────

describe('POST /api/notifications/[notificationId]/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const { POST } = await import('@/app/api/notifications/[notificationId]/read/route');
    const req = new NextRequest('http://localhost/api/notifications/notif_1/read', { method: 'POST' });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('marks a single notification as read and returns success', async () => {
    mockRequireUser.mockResolvedValue(authenticatedUser);
    mockMarkRead.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/notifications/[notificationId]/read/route');
    const req = new NextRequest('http://localhost/api/notifications/notif_1/read', { method: 'POST' });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockMarkRead).toHaveBeenCalledWith('notif_1', 'user_1');
  });
});
