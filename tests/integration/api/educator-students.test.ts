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
      findUnique: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('GET /api/educator/students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockReturnValueOnce({ userId: null } as any);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students');

    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not an educator', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'user_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'STUDENT',
    } as any);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students');

    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it('returns paginated student list for educator', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);

    const mockStudents = [
      {
        id: 'student_1',
        user: { id: 'user_1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
        iepAccommodations: [],
        _count: { sessions: 5, progress: 10 },
      },
      {
        id: 'student_2',
        user: { id: 'user_2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
        iepAccommodations: [],
        _count: { sessions: 3, progress: 8 },
      },
    ];

    vi.mocked(db.student.findMany).mockResolvedValueOnce(mockStudents as any);
    vi.mocked(db.class.findUnique).mockResolvedValueOnce({ tenantId: 'tenant_123' } as any);
    vi.mocked(db.student.count).mockResolvedValueOnce(2);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
  });

  it('filters students by classId when provided', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);
    vi.mocked(db.class.findUnique).mockResolvedValueOnce({ tenantId: 'tenant_123' } as any);
    vi.mocked(db.student.findMany).mockResolvedValueOnce([{
      id: 'student_1',
      user: { id: 'user_1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
      iepAccommodations: [],
      _count: { sessions: 5, progress: 10 },
    }] as any);
    vi.mocked(db.student.count).mockResolvedValueOnce(1);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students?classId=class_123');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(db.class.findUnique).toHaveBeenCalledWith({
      where: { id: 'class_123' },
      select: { tenantId: true },
    });
    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          user: { tenantId: 'tenant_123' },
          enrollments: { some: { classId: 'class_123' } },
        },
      })
    );
  });



  it('returns 403 when classId belongs to a different tenant', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.class.findUnique).mockReset();
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);
    vi.mocked(db.class.findUnique).mockResolvedValue({ tenantId: 'tenant_other' } as any);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students?classId=class_other');

    const response = await GET(req);

    expect(response.status).toBe(403);
    expect(db.student.findMany).not.toHaveBeenCalled();
    expect(db.student.count).not.toHaveBeenCalled();
  });

  it('respects pagination parameters', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: 'educator_123',
      clerkUserId: 'clerk_educator_123',
      tenantId: 'tenant_123',
      role: 'EDUCATOR',
    } as any);
    vi.mocked(db.student.findMany).mockResolvedValueOnce([] as any);
    vi.mocked(db.student.count).mockResolvedValueOnce(50);

    const { GET } = await import('@/app/api/educator/students/route');
    const req = new NextRequest('http://localhost:3000/api/educator/students?page=2&pageSize=10');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.pageSize).toBe(10);
    expect(data.hasMore).toBe(true);
    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });
});
