import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockCourseFindMany = vi.fn();
const mockCourseCount = vi.fn();
const mockCourseCreate = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    course: {
      findMany: mockCourseFindMany,
      count: mockCourseCount,
      create: mockCourseCreate,
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

const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };

describe('/api/lms/courses', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { AuthenticationError } = await import('@/lib/api-errors');
      mockRequireUser.mockRejectedValue(new AuthenticationError());
      const { GET } = await import('@/app/api/lms/courses/route');
      const req = new NextRequest('http://localhost/api/lms/courses');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it('returns 403 for STUDENT role', async () => {
      mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
      const { GET } = await import('@/app/api/lms/courses/route');
      const req = new NextRequest('http://localhost/api/lms/courses');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns paginated course list for EDUCATOR', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const courses = [{ id: 'c1', name: 'Math 101', subject: 'MATH', _count: { classes: 2 } }];
      mockCourseFindMany.mockResolvedValue(courses);
      mockCourseCount.mockResolvedValue(1);
      const { GET } = await import('@/app/api/lms/courses/route');

      const req = new NextRequest('http://localhost/api/lms/courses?page=1&limit=10');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it('filters by subject query param', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockCourseFindMany.mockResolvedValue([]);
      mockCourseCount.mockResolvedValue(0);
      const { GET } = await import('@/app/api/lms/courses/route');

      const req = new NextRequest('http://localhost/api/lms/courses?subject=SCIENCE');
      await GET(req, { params: Promise.resolve({}) });
      expect(mockCourseFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant_1', subject: 'SCIENCE' },
        }),
      );
    });
  });

  describe('POST', () => {
    it('returns 403 for PARENT role', async () => {
      mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'PARENT' });
      const { POST } = await import('@/app/api/lms/courses/route');
      const req = new NextRequest('http://localhost/api/lms/courses', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', subject: 'MATH', gradeLevel: [5] }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid body', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const { POST } = await import('@/app/api/lms/courses/route');
      const req = new NextRequest('http://localhost/api/lms/courses', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it('creates course and returns 201', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const created = { id: 'c_new', tenantId: 'tenant_1', name: 'Algebra', subject: 'MATH', gradeLevel: [7, 8] };
      mockCourseCreate.mockResolvedValue(created);
      const { POST } = await import('@/app/api/lms/courses/route');

      const req = new NextRequest('http://localhost/api/lms/courses', {
        method: 'POST',
        body: JSON.stringify({ name: 'Algebra', subject: 'MATH', gradeLevel: [7, 8] }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.name).toBe('Algebra');
      expect(mockCourseCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 'tenant_1', name: 'Algebra', subject: 'MATH' }),
      });
    });
  });
});
