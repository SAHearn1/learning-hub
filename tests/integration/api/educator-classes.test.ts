import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'clerk_educator_123' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    class: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('POST /api/educator/classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { POST } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes', {
      method: 'POST',
      body: JSON.stringify({
        schoolId: 'school_123',
        name: 'Math 101',
        subject: 'MATH',
        gradeLevel: 5,
        academicYear: '2024-2025',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  }, 15000);

  it('returns 403 when user is not an educator', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'STUDENT',
    } as any);

    const { POST } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes', {
      method: 'POST',
      body: JSON.stringify({
        schoolId: 'school_123',
        name: 'Math 101',
        subject: 'MATH',
        gradeLevel: 5,
        academicYear: '2024-2025',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('creates a new class for educator', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);

    const mockClass = {
      id: 'class_123',
      tenantId: 'tenant_123',
      schoolId: 'school_123',
      name: 'Math 101',
      subject: 'MATH',
      gradeLevel: 5,
      academicYear: '2024-2025',
      educatorId: 'educator_123',
      createdAt: new Date(),
    };

    vi.mocked(db.class.create).mockResolvedValueOnce(mockClass as any);

    const { POST } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes', {
      method: 'POST',
      body: JSON.stringify({
        schoolId: 'school_123',
        name: 'Math 101',
        subject: 'MATH',
        gradeLevel: 5,
        academicYear: '2024-2025',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.id).toBe('class_123');
    expect(data.data.name).toBe('Math 101');
  });

  it('validates required fields', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);

    const { POST } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes', {
      method: 'POST',
      body: JSON.stringify({
        schoolId: 'school_123',
        // Missing required fields
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/educator/classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns classes for educator', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);

    const mockClasses = [
      {
        id: 'class_1',
        name: 'Math 101',
        subject: 'MATH',
        gradeLevel: 5,
        school: { name: 'Test School' },
        _count: { enrollments: 20 },
      },
      {
        id: 'class_2',
        name: 'Science 101',
        subject: 'SCIENCE',
        gradeLevel: 5,
        school: { name: 'Test School' },
        _count: { enrollments: 18 },
      },
    ];

    vi.mocked(db.class.findMany).mockResolvedValueOnce(mockClasses as any);

    const { GET } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].name).toBe('Math 101');
  });

  it('filters classes by educator for EDUCATOR role', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);
    vi.mocked(db.class.findMany).mockResolvedValueOnce([]);

    const { GET } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes');

    await GET(req);

    expect(db.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { educatorId: 'educator_123' },
      })
    );
  });

  it('filters classes by tenant for admin roles', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'admin_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'SCHOOL_ADMIN',
    } as any);
    vi.mocked(db.class.findMany).mockResolvedValueOnce([]);

    const { GET } = await import('@/app/api/educator/classes/route');
    const req = new NextRequest('http://localhost:3000/api/educator/classes');

    await GET(req);

    expect(db.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant_123' },
      })
    );
  });
});
