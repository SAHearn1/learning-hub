import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_user_123' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/billing', () => ({
  createCheckoutSession: vi.fn(() => Promise.resolve({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/test',
  })),
}));

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier: 'PROFESSIONAL' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('creates checkout session for valid tier', async () => {
    const { db } = await import('@/lib/db');
    const { createCheckoutSession } = await import('@/lib/billing');
    
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_user_123',
      tenantId: 'tenant_123',
      email: 'user@test.com',
      role: 'SCHOOL_ADMIN',
    } as any);

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'PROFESSIONAL' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe('https://checkout.stripe.com/test');
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_123',
        userId: 'user_123',
        email: 'user@test.com',
        tier: 'PROFESSIONAL',
      })
    );
  });

  it('validates tier values', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_user_123',
      tenantId: 'tenant_123',
      email: 'user@test.com',
      role: 'SCHOOL_ADMIN',
    } as any);

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'INVALID_TIER' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('handles JSON tier request', async () => {
    const { db } = await import('@/lib/db');
    const { createCheckoutSession } = await import('@/lib/billing');
    
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_user_123',
      tenantId: 'tenant_123',
      email: 'user@test.com',
      role: 'SCHOOL_ADMIN',
    } as any);

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: 'STARTER' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBeDefined();
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'STARTER',
      })
    );
  });

  it('redirects when Accept header requests HTML', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_user_123',
      tenantId: 'tenant_123',
      email: 'user@test.com',
      role: 'SCHOOL_ADMIN',
    } as any);

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'accept': 'text/html',
      },
      body: JSON.stringify({ tier: 'ENTERPRISE' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('checkout.stripe.com');
  });
});
