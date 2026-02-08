import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_test_user_123' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/compliance', () => ({
  canManageMinorConsent: vi.fn((role: string) => ['PARENT', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(role)),
  isConsentStatusTransitionAllowed: vi.fn(() => true),
}));

describe('GET /api/compliance/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns consent status for authenticated user', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'user_123',
        clerkUserId: 'clerk_test_user_123',
        tenantId: 'tenant_123',
        role: 'STUDENT',
      } as any)
      .mockResolvedValueOnce({
        id: 'user_123',
        tenantId: 'tenant_123',
        firstName: 'John',
        lastName: 'Doe',
        isMinor: true,
        consentStatus: 'GRANTED',
        updatedAt: new Date(),
      } as any);

    const { GET } = await import('@/app/api/compliance/consent/route');
    const req = new NextRequest('http://localhost:3000/api/compliance/consent');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.consent).toBeDefined();
    expect(data.consent.consentStatus).toBe('GRANTED');
  });

  it('returns 403 when non-parent tries to view other student', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_test_user_123',
      tenantId: 'tenant_123',
      role: 'STUDENT',
    } as any);

    const { GET } = await import('@/app/api/compliance/consent/route');
    const req = new NextRequest('http://localhost:3000/api/compliance/consent?studentUserId=other_user');

    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it('returns 404 when student not found', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'user_123',
        clerkUserId: 'clerk_test_user_123',
        tenantId: 'tenant_123',
        role: 'PARENT',
      } as any)
      .mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/compliance/consent/route');
    const req = new NextRequest('http://localhost:3000/api/compliance/consent?studentUserId=nonexistent');

    const response = await GET(req);
    expect(response.status).toBe(404);
  });
});

describe('POST /api/compliance/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates consent status for minor', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'parent_123',
        clerkUserId: 'clerk_test_user_123',
        tenantId: 'tenant_123',
        role: 'PARENT',
      } as any)
      .mockResolvedValueOnce({
        id: 'student_123',
        tenantId: 'tenant_123',
        isMinor: true,
        consentStatus: 'PENDING',
      } as any);
    vi.mocked(db.user.update).mockResolvedValueOnce({
      id: 'student_123',
      firstName: 'Jane',
      lastName: 'Doe',
      consentStatus: 'GRANTED',
      updatedAt: new Date(),
    } as any);
    vi.mocked(db.auditLog.create).mockResolvedValueOnce({} as any);

    const { POST } = await import('@/app/api/compliance/consent/route');
    const req = new NextRequest('http://localhost:3000/api/compliance/consent', {
      method: 'POST',
      body: JSON.stringify({
        studentUserId: 'student_123',
        consentStatus: 'GRANTED',
        method: 'electronic',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consent.consentStatus).toBe('GRANTED');
  });

  it('returns 403 when non-authorized role tries to update', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_test_user_123',
      tenantId: 'tenant_123',
      role: 'STUDENT',
    } as any);

    const { POST } = await import('@/app/api/compliance/consent/route');
    const req = new NextRequest('http://localhost:3000/api/compliance/consent', {
      method: 'POST',
      body: JSON.stringify({
        studentUserId: 'student_123',
        consentStatus: 'GRANTED',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('returns 400 for non-minor account', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({
        id: 'parent_123',
        clerkUserId: 'clerk_test_user_123',
        tenantId: 'tenant_123',
        role: 'PARENT',
      } as any)
      .mockResolvedValueOnce({
        id: 'student_123',
        tenantId: 'tenant_123',
        isMinor: false,
        consentStatus: 'PENDING',
      } as any);

    const { POST } = await import('@/app/api/compliance/consent/route');
    const req = new NextRequest('http://localhost:3000/api/compliance/consent', {
      method: 'POST',
      body: JSON.stringify({
        studentUserId: 'student_123',
        consentStatus: 'GRANTED',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
