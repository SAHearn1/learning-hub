import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireUser = vi.fn();
const mockParentFindUnique = vi.fn();
const mockUserFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
  requireRole: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    parent: { findUnique: mockParentFindUnique },
    user: { findMany: mockUserFindMany },
  },
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const parentUser = {
  id: 'user_parent_1',
  tenantId: 'tenant_1',
  role: 'PARENT',
};

const educatorUser = {
  id: 'user_edu_1',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

const studentUser = {
  id: 'user_stu_1',
  tenantId: 'tenant_1',
  role: 'STUDENT',
};

const parentRecord = {
  id: 'parent_1',
  userId: 'user_parent_1',
  childrenIds: ['user_child_1', 'user_child_2'],
};

const mockStudents = [
  {
    id: 'user_child_1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@school.edu',
    isMinor: true,
    consentStatus: 'GRANTED',
    dateOfBirth: '2012-05-15',
  },
  {
    id: 'user_child_2',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@school.edu',
    isMinor: true,
    consentStatus: 'PENDING',
    dateOfBirth: '2014-08-22',
  },
];

const routeCtx = { params: Promise.resolve({}) };

// ─── GET /api/parent/students ────────────────────────────────────────────────

describe('GET /api/parent/students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it('returns 403 for EDUCATOR role', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(403);
  });

  it('returns empty array when parent has no linked students', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockParentFindUnique.mockResolvedValue({
      id: 'parent_1',
      userId: 'user_parent_1',
      childrenIds: [],
    });
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toEqual([]);
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it('returns empty array when parent record does not exist', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockParentFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toEqual([]);
  });

  it('returns list of students linked to parent', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockParentFindUnique.mockResolvedValue(parentRecord);
    mockUserFindMany.mockResolvedValue(mockStudents);
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toHaveLength(2);
    expect(body.students[0].firstName).toBe('Alice');
    expect(body.students[1].firstName).toBe('Bob');
    expect(mockParentFindUnique).toHaveBeenCalledWith({
      where: { userId: 'user_parent_1' },
    });
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['user_child_1', 'user_child_2'] } },
      }),
    );
  });

  it('returns students with isMinor flag and consentStatus fields', async () => {
    mockRequireUser.mockResolvedValue(parentUser);
    mockParentFindUnique.mockResolvedValue(parentRecord);
    mockUserFindMany.mockResolvedValue(mockStudents);
    const { GET } = await import('@/app/api/parent/students/route');

    const req = new NextRequest('http://localhost/api/parent/students');
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    const firstStudent = body.students[0];
    expect(firstStudent.isMinor).toBe(true);
    expect(firstStudent.consentStatus).toBe('GRANTED');
    const secondStudent = body.students[1];
    expect(secondStudent.consentStatus).toBe('PENDING');
  });
});
