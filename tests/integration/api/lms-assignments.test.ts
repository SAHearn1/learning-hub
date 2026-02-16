import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockClassFindUnique = vi.fn();
const mockAssignmentFindMany = vi.fn();
const mockAssignmentCreate = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mockClassFindUnique },
    assignment: { findMany: mockAssignmentFindMany, create: mockAssignmentCreate },
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
const studentUser = { id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT', student: { id: 'stu_1' } };

describe('/api/lms/assignments', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { AuthenticationError } = await import('@/lib/api-errors');
      mockRequireUser.mockRejectedValue(new AuthenticationError());
      const { GET } = await import('@/app/api/lms/assignments/route');
      const req = new NextRequest('http://localhost/api/lms/assignments?classId=cls_1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it('returns 400 when classId missing', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const { GET } = await import('@/app/api/lms/assignments/route');
      const req = new NextRequest('http://localhost/api/lms/assignments');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when class not found', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockClassFindUnique.mockResolvedValue(null);
      const { GET } = await import('@/app/api/lms/assignments/route');
      const req = new NextRequest('http://localhost/api/lms/assignments?classId=cls_missing');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(404);
    });

    it('returns 403 for cross-tenant class', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_other' });
      const { GET } = await import('@/app/api/lms/assignments/route');
      const req = new NextRequest('http://localhost/api/lms/assignments?classId=cls_1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('students see only published assignments', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
      mockAssignmentFindMany.mockResolvedValue([{ id: 'a1', title: 'HW1', published: true }]);
      const { GET } = await import('@/app/api/lms/assignments/route');

      const req = new NextRequest('http://localhost/api/lms/assignments?classId=cls_1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      expect(mockAssignmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { classId: 'cls_1', published: true } }),
      );
    });

    it('educators see all assignments', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
      mockAssignmentFindMany.mockResolvedValue([
        { id: 'a1', published: true },
        { id: 'a2', published: false },
      ]);
      const { GET } = await import('@/app/api/lms/assignments/route');

      const req = new NextRequest('http://localhost/api/lms/assignments?classId=cls_1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(mockAssignmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { classId: 'cls_1' } }),
      );
    });
  });

  describe('POST', () => {
    it('returns 403 for STUDENT role', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      const { POST } = await import('@/app/api/lms/assignments/route');
      const req = new NextRequest('http://localhost/api/lms/assignments', {
        method: 'POST',
        body: JSON.stringify({ classId: 'cls_1', title: 'Test' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when class not found on create', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockClassFindUnique.mockResolvedValue(null);
      const { POST } = await import('@/app/api/lms/assignments/route');
      const req = new NextRequest('http://localhost/api/lms/assignments', {
        method: 'POST',
        body: JSON.stringify({ classId: 'cls_missing', title: 'HW1' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(404);
    });

    it('creates assignment and returns 201', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
      const created = { id: 'a_new', title: 'Homework 1', classId: 'cls_1', type: 'HOMEWORK' };
      mockAssignmentCreate.mockResolvedValue(created);
      const { POST } = await import('@/app/api/lms/assignments/route');

      const req = new NextRequest('http://localhost/api/lms/assignments', {
        method: 'POST',
        body: JSON.stringify({ classId: 'cls_1', title: 'Homework 1' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.title).toBe('Homework 1');
    });
  });
});
