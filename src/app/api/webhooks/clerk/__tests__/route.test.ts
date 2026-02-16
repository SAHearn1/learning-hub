import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerify = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: mockVerify,
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
  });

  it('returns 500 when webhook secret is not configured', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const { POST } = await import('../route');

    const req = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Webhook not configured' });
  });

  it('returns 400 when svix headers are missing', async () => {
    const { POST } = await import('../route');

    const req = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Missing svix headers' });
  });

  it('returns 401 when signature verification fails', async () => {
    const { POST } = await import('../route');
    mockVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const req = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      headers: {
        'svix-id': 'msg_123',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'v1,bad',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid signature' });
  });

  it('processes user.updated event and updates mapped user record', async () => {
    const { POST } = await import('../route');
    mockVerify.mockReturnValue({
      type: 'user.updated',
      data: {
        id: 'clerk_123',
        email_addresses: [{ email_address: 'new@example.com' }],
        first_name: 'New',
        last_name: 'Name',
      },
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'user_1',
      email: 'old@example.com',
      firstName: 'Old',
      lastName: 'Name',
    });
    mockUserUpdate.mockResolvedValue({});

    const req = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      headers: {
        'svix-id': 'msg_123',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'v1,ok',
      },
      body: JSON.stringify({ some: 'payload' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Name',
      },
    });
  });
});
