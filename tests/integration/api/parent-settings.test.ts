import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockParentUpdate = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: { parent: { update: mockParentUpdate } },
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

const routeContext = { params: Promise.resolve({}) };

const parentUser = {
  id: 'user_parent',
  tenantId: 'tenant_1',
  role: 'PARENT',
  parent: {
    id: 'parent_1',
    childrenIds: ['child_user_1', 'child_user_2'],
    communicationPrefs: {
      emailNotifications: true,
      weeklyDigest: false,
      sessionAlerts: true,
      progressMilestones: true,
    },
  },
};

describe('GET /api/parent/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not a parent', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'EDUCATOR' });
    const { GET } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 403 when parent profile is missing', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'PARENT', parent: null });
    const { GET } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns settings for authenticated parent', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { GET } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.childrenIds).toEqual(['child_user_1', 'child_user_2']);
    expect(body.data.communicationPrefs.emailNotifications).toBe(true);
    expect(body.data.communicationPrefs.weeklyDigest).toBe(false);
  });
});

describe('PATCH /api/parent/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when user is not a parent', async () => {
    mockRequireUser.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { PATCH } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings', {
      method: 'PATCH',
      body: JSON.stringify({ communicationPrefs: { emailNotifications: false } }),
    });
    const res = await PATCH(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const { PATCH } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings', {
      method: 'PATCH',
      body: JSON.stringify({ communicationPrefs: 'not-an-object' }),
    });
    const res = await PATCH(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('updates communication preferences', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    const updatedParent = { ...parentUser.parent, communicationPrefs: { emailNotifications: false, weeklyDigest: true, sessionAlerts: false, progressMilestones: false } };
    mockParentUpdate.mockResolvedValue(updatedParent);
    const { PATCH } = await import('@/app/api/parent/settings/route');

    const req = new NextRequest('http://localhost/api/parent/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        communicationPrefs: { emailNotifications: false, weeklyDigest: true, sessionAlerts: false, progressMilestones: false },
      }),
    });
    const res = await PATCH(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.communicationPrefs.emailNotifications).toBe(false);
    expect(mockParentUpdate).toHaveBeenCalledWith({
      where: { id: 'parent_1' },
      data: { communicationPrefs: { emailNotifications: false, weeklyDigest: true, sessionAlerts: false, progressMilestones: false } },
    });
  });
});
