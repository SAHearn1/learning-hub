import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    class: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    student: {
      count: vi.fn(),
    },
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

const routeContext = { params: Promise.resolve({}) };

const schoolAdminUser = {
  id: 'user_admin',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
};

// ─── GET /api/school-admin/classes ───────────────────────────────────────────

describe('GET /api/school-admin/classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/school-admin/classes/route');
    const req = new NextRequest('http://localhost/api/school-admin/classes');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user role is not SCHOOL_ADMIN or higher', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());

    const { GET } = await import('@/app/api/school-admin/classes/route');
    const req = new NextRequest('http://localhost/api/school-admin/classes');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns paginated class list for school admin', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    const mockClasses = [
      {
        id: 'class_1',
        name: 'Math 101',
        educator: { id: 'educator_1', firstName: 'Jane', lastName: 'Doe', email: 'jane@school.edu' },
        _count: { enrollments: 24 },
      },
      {
        id: 'class_2',
        name: 'English 101',
        educator: { id: 'educator_2', firstName: 'John', lastName: 'Smith', email: 'john@school.edu' },
        _count: { enrollments: 22 },
      },
    ];

    vi.mocked(db.class.findMany).mockResolvedValue(mockClasses as any);
    vi.mocked(db.class.count).mockResolvedValue(2);

    const { GET } = await import('@/app/api/school-admin/classes/route');
    const req = new NextRequest('http://localhost/api/school-admin/classes');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it('scopes query to the authenticated user tenantId', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');
    vi.mocked(db.class.findMany).mockResolvedValue([] as any);
    vi.mocked(db.class.count).mockResolvedValue(0);

    const { GET } = await import('@/app/api/school-admin/classes/route');
    const req = new NextRequest('http://localhost/api/school-admin/classes');
    await GET(req, routeContext);

    expect(db.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant_1' } }),
    );
    expect(db.class.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant_1' } });
  });

  it('respects page and limit query parameters', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');
    vi.mocked(db.class.findMany).mockResolvedValue([] as any);
    vi.mocked(db.class.count).mockResolvedValue(50);

    const { GET } = await import('@/app/api/school-admin/classes/route');
    const req = new NextRequest('http://localhost/api/school-admin/classes?page=3&limit=10');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.page).toBe(3);
    expect(body.limit).toBe(10);
    expect(db.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

// ─── GET /api/school-admin/educators ─────────────────────────────────────────

describe('GET /api/school-admin/educators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/school-admin/educators/route');
    const req = new NextRequest('http://localhost/api/school-admin/educators');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns educator list with class count and certifications', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    const mockEducators = [
      {
        id: 'user_e1',
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice@school.edu',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
        educator: { certifications: ['Special Ed'], specializations: ['IEP'] },
        teachingClasses: [{ id: 'class_1' }, { id: 'class_2' }],
      },
    ];

    vi.mocked(db.user.findMany).mockResolvedValue(mockEducators as any);
    vi.mocked(db.user.count).mockResolvedValue(1);

    const { GET } = await import('@/app/api/school-admin/educators/route');
    const req = new NextRequest('http://localhost/api/school-admin/educators');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].classCount).toBe(2);
    expect(body.data[0].certifications).toEqual(['Special Ed']);
    expect(body.total).toBe(1);
  });

  it('defaults to empty arrays when educator profile is missing', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user_e2',
        firstName: 'Bob',
        lastName: 'Green',
        email: 'bob@school.edu',
        createdAt: new Date(),
        updatedAt: new Date(),
        educator: null,
        teachingClasses: [],
      },
    ] as any);
    vi.mocked(db.user.count).mockResolvedValue(1);

    const { GET } = await import('@/app/api/school-admin/educators/route');
    const req = new NextRequest('http://localhost/api/school-admin/educators');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].certifications).toEqual([]);
    expect(body.data[0].specializations).toEqual([]);
    expect(body.data[0].classCount).toBe(0);
  });
});

// ─── GET /api/school-admin/students ──────────────────────────────────────────

describe('GET /api/school-admin/students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/school-admin/students/route');
    const req = new NextRequest('http://localhost/api/school-admin/students');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns student list with computed averageMastery', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user_s1',
        firstName: 'Charlie',
        lastName: 'Davis',
        email: 'charlie@school.edu',
        consentStatus: 'GRANTED',
        createdAt: new Date(),
        student: {
          id: 'student_s1',
          gradeLevel: 8,
          enrollments: [{ classId: 'class_1' }, { classId: 'class_2' }],
          iepAccommodations: [{ id: 'iep_1' }],
          progress: [{ masteryLevel: 0.8 }, { masteryLevel: 0.6 }],
        },
      },
    ] as any);
    vi.mocked(db.user.count).mockResolvedValue(1);

    const { GET } = await import('@/app/api/school-admin/students/route');
    const req = new NextRequest('http://localhost/api/school-admin/students');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].classCount).toBe(2);
    expect(body.data[0].iepAccommodationCount).toBe(1);
    expect(body.data[0].averageMastery).toBe(0.7);
  });

  it('returns averageMastery of 0 when no progress entries', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user_s2',
        firstName: 'Dana',
        lastName: 'Lee',
        email: 'dana@school.edu',
        consentStatus: 'PENDING',
        createdAt: new Date(),
        student: {
          id: 'student_s2',
          gradeLevel: 5,
          enrollments: [],
          iepAccommodations: [],
          progress: [],
        },
      },
    ] as any);
    vi.mocked(db.user.count).mockResolvedValue(1);

    const { GET } = await import('@/app/api/school-admin/students/route');
    const req = new NextRequest('http://localhost/api/school-admin/students');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].averageMastery).toBe(0);
  });
});

// ─── GET /api/school-admin/stats ─────────────────────────────────────────────

describe('GET /api/school-admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());

    const { GET } = await import('@/app/api/school-admin/stats/route');
    const req = new NextRequest('http://localhost/api/school-admin/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns aggregated school stats', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.class.count).mockResolvedValue(10);
    vi.mocked(db.user.count)
      .mockResolvedValueOnce(8)   // educator count
      .mockResolvedValueOnce(200) // student count
      .mockResolvedValueOnce(180) // consent granted count
      .mockResolvedValueOnce(200); // total students (for rate calc)
    vi.mocked(db.student.count).mockResolvedValue(30); // iepStudentCount

    const { GET } = await import('@/app/api/school-admin/stats/route');
    const req = new NextRequest('http://localhost/api/school-admin/stats');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.classCount).toBe(10);
    expect(body.educatorCount).toBe(8);
    expect(body.studentCount).toBe(200);
    expect(body.iepStudentCount).toBe(30);
    expect(typeof body.complianceRate).toBe('number');
  });

  it('returns complianceRate of 100 when there are no students', async () => {
    mockRequireRole.mockResolvedValue(schoolAdminUser);
    const { db } = await import('@/lib/db');

    vi.mocked(db.class.count).mockResolvedValue(0);
    vi.mocked(db.user.count)
      .mockResolvedValueOnce(0) // educator
      .mockResolvedValueOnce(0) // student
      .mockResolvedValueOnce(0) // consent granted
      .mockResolvedValueOnce(0); // total for rate
    vi.mocked(db.student.count).mockResolvedValue(0);

    const { GET } = await import('@/app/api/school-admin/stats/route');
    const req = new NextRequest('http://localhost/api/school-admin/stats');
    const res = await GET(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.complianceRate).toBe(100);
  });
});
