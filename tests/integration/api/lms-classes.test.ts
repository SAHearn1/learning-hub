import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockClassFindMany = vi.fn();
const mockClassFindUnique = vi.fn();
const mockClassEnrollmentFindMany = vi.fn();
const mockStudentUpsert = vi.fn();
const mockAssignmentFindMany = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser, requireRole: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: {
    class: {
      findMany: mockClassFindMany,
      findUnique: mockClassFindUnique,
    },
    classEnrollment: {
      findMany: mockClassEnrollmentFindMany,
    },
    student: {
      upsert: mockStudentUpsert,
    },
    assignment: {
      findMany: mockAssignmentFindMany,
    },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
  student: { id: 'student_1' },
};

const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

describe('/api/lms/classes (student class listing)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET /api/lms/classes', () => {
    it('returns 401 when not authenticated', async () => {
      const { AuthenticationError } = await import('@/lib/api-errors');
      mockRequireUser.mockRejectedValue(new AuthenticationError());
      const { GET } = await import('@/app/api/lms/classes/route');
      const req = new NextRequest('http://localhost/api/lms/classes');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it('returns 403 when EDUCATOR tries to list via student route', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const { GET } = await import('@/app/api/lms/classes/route');
      const req = new NextRequest('http://localhost/api/lms/classes');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns 403 for PARENT role', async () => {
      mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'PARENT' });
      const { GET } = await import('@/app/api/lms/classes/route');
      const req = new NextRequest('http://localhost/api/lms/classes');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns enrolled class list for STUDENT with existing student profile', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      const enrollments = [
        {
          enrolledAt: new Date('2026-01-01'),
          class: {
            id: 'class_1',
            name: 'Math 5A',
            subject: 'MATH',
            gradeLevel: 5,
            academicYear: '2025-2026',
            educator: { firstName: 'Jane', lastName: 'Doe' },
          },
        },
      ];
      mockClassEnrollmentFindMany.mockResolvedValue(enrollments);
      const { GET } = await import('@/app/api/lms/classes/route');
      const req = new NextRequest('http://localhost/api/lms/classes');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Math 5A');
      expect(body.data[0].educatorName).toBe('Jane Doe');
    });

    it('upserts student profile when student field is missing and returns classes', async () => {
      mockRequireUser.mockResolvedValue({ id: 'user_stu2', tenantId: 'tenant_1', role: 'STUDENT' });
      mockStudentUpsert.mockResolvedValue({ id: 'student_new' });
      mockClassEnrollmentFindMany.mockResolvedValue([]);
      const { GET } = await import('@/app/api/lms/classes/route');
      const req = new NextRequest('http://localhost/api/lms/classes');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      expect(mockStudentUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user_stu2' } }),
      );
    });

    it('returns empty list when student has no active enrollments', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockClassEnrollmentFindMany.mockResolvedValue([]);
      const { GET } = await import('@/app/api/lms/classes/route');
      const req = new NextRequest('http://localhost/api/lms/classes');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });
  });
});

describe('/api/lms/classes/[classId]/roster', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/roster');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/roster');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 404 when class does not exist', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/bad_id/roster');
    const res = await GET(req, { params: Promise.resolve({ classId: 'bad_id' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when class belongs to a different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'class_1', tenantId: 'tenant_other', name: 'Other Class' });
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/roster');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(403);
  });

  it('returns roster for EDUCATOR in same tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'class_1', tenantId: 'tenant_1', name: 'Math 5A' });
    const enrollments = [
      {
        enrolledAt: new Date('2026-01-01'),
        student: {
          id: 'student_1',
          gradeLevel: 5,
          user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
          progress: [{ masteryLevel: 80, standardId: 'std_1' }],
          _count: { sessions: 3, submissions: 5 },
        },
      },
    ];
    mockClassEnrollmentFindMany.mockResolvedValue(enrollments);
    const { GET } = await import('@/app/api/lms/classes/[classId]/roster/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/roster');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Alice Smith');
    expect(body.data[0].email).toBe('alice@example.com');
    expect(body.data[0].averageMastery).toBe(80);
    expect(body.total).toBe(1);
    expect(body.classId).toBe('class_1');
  });
});

describe('/api/lms/classes/[classId]/assignments', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/assignments');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when class does not exist', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/bad_id/assignments');
    const res = await GET(req, { params: Promise.resolve({ classId: 'bad_id' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when class belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'class_1', tenantId: 'tenant_other' });
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/assignments');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(403);
  });

  it('returns all assignments (published + unpublished) for EDUCATOR', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockClassFindUnique.mockResolvedValue({ id: 'class_1', tenantId: 'tenant_1' });
    const assignments = [
      { id: 'asgn_1', title: 'Homework 1', published: false, dueDate: new Date(), _count: { submissions: 0 } },
      { id: 'asgn_2', title: 'Quiz 1', published: true, dueDate: new Date(), _count: { submissions: 3 } },
    ];
    mockAssignmentFindMany.mockResolvedValue(assignments);
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/assignments');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    // Educator query should not filter by published
    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ published: true }),
      }),
    );
  });

  it('returns only published assignments for STUDENT with submission data', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockClassFindUnique.mockResolvedValue({ id: 'class_1', tenantId: 'tenant_1' });
    const assignments = [
      {
        id: 'asgn_2',
        title: 'Quiz 1',
        published: true,
        dueDate: new Date(),
        _count: { submissions: 1 },
        submissions: [{ id: 'sub_1', status: 'SUBMITTED', grade: { score: 90, percentage: 90, letterGrade: 'A' } }],
      },
    ];
    mockAssignmentFindMany.mockResolvedValue(assignments);
    const { GET } = await import('@/app/api/lms/classes/[classId]/assignments/route');
    const req = new NextRequest('http://localhost/api/lms/classes/class_1/assignments');
    const res = await GET(req, { params: Promise.resolve({ classId: 'class_1' }) });
    expect(res.status).toBe(200);
    // Student query should include published: true filter
    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ published: true }),
      }),
    );
  });
});
