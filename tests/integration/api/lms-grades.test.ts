import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockClassFindUnique = vi.fn();
const mockSubmissionFindUnique = vi.fn();
const mockSubmissionUpdate = vi.fn();
const mockGradeFindMany = vi.fn();
const mockGradeUpsert = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { findUnique: mockStudentFindUnique },
    class: { findUnique: mockClassFindUnique },
    submission: { findUnique: mockSubmissionFindUnique, update: mockSubmissionUpdate },
    grade: { findMany: mockGradeFindMany, upsert: mockGradeUpsert },
  },
}));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };
const studentUser = { id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT', student: { id: 'stu_1' } };
const parentUser = {
  id: 'user_par', tenantId: 'tenant_1', role: 'PARENT',
  parent: { id: 'par_1', childrenIds: ['user_child_1'] },
};

describe('/api/lms/grades', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { AuthenticationError } = await import('@/lib/api-errors');
      mockRequireUser.mockRejectedValue(new AuthenticationError());
      const { GET } = await import('@/app/api/lms/grades/route');
      const req = new NextRequest('http://localhost/api/lms/grades?classId=cls_1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it('parent can view child grades', async () => {
      mockRequireUser.mockResolvedValue(parentUser);
      mockStudentFindUnique.mockResolvedValue({ userId: 'user_child_1' });
      mockGradeFindMany.mockResolvedValue([{ id: 'g1', score: 90, percentage: 90 }]);
      const { GET } = await import('@/app/api/lms/grades/route');

      const req = new NextRequest('http://localhost/api/lms/grades?studentId=stu_child');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });

    it('parent denied for non-child student', async () => {
      mockRequireUser.mockResolvedValue(parentUser);
      mockStudentFindUnique.mockResolvedValue({ userId: 'user_stranger' });
      const { GET } = await import('@/app/api/lms/grades/route');

      const req = new NextRequest('http://localhost/api/lms/grades?studentId=stu_stranger');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('student sees own grades', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockGradeFindMany.mockResolvedValue([{ id: 'g1', score: 85 }]);
      const { GET } = await import('@/app/api/lms/grades/route');

      const req = new NextRequest('http://localhost/api/lms/grades');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
    });

    it('educator requires classId', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const { GET } = await import('@/app/api/lms/grades/route');

      const req = new NextRequest('http://localhost/api/lms/grades');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it('educator sees class grades', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
      mockGradeFindMany.mockResolvedValue([
        { id: 'g1', score: 90 },
        { id: 'g2', score: 85 },
      ]);
      const { GET } = await import('@/app/api/lms/grades/route');

      const req = new NextRequest('http://localhost/api/lms/grades?classId=cls_1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
    });
  });

  describe('POST', () => {
    it('returns 403 for STUDENT role', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      const { POST } = await import('@/app/api/lms/grades/route');
      const req = new NextRequest('http://localhost/api/lms/grades', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 'sub_1', score: 90 }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when submission not found', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockSubmissionFindUnique.mockResolvedValue(null);
      const { POST } = await import('@/app/api/lms/grades/route');
      const req = new NextRequest('http://localhost/api/lms/grades', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 'sub_missing', score: 90 }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(404);
    });

    it('returns 403 for cross-tenant submission', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockSubmissionFindUnique.mockResolvedValue({ id: 'sub_1', tenantId: 'tenant_other', assignment: {} });
      const { POST } = await import('@/app/api/lms/grades/route');
      const req = new NextRequest('http://localhost/api/lms/grades', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 'sub_1', score: 90 }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('grades submission with auto letter grade and audit log', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockSubmissionFindUnique.mockResolvedValue({
        id: 'sub_1', tenantId: 'tenant_1', assignmentId: 'a1',
        assignment: { points: 100 },
      });
      mockGradeUpsert.mockResolvedValue({
        id: 'grade_new', score: 95, maxScore: 100, percentage: 95, letterGrade: 'A',
      });
      mockSubmissionUpdate.mockResolvedValue({});
      const { POST } = await import('@/app/api/lms/grades/route');
      const { appendImmutableAuditLog } = await import('@/lib/audit');

      const req = new NextRequest('http://localhost/api/lms/grades', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 'sub_1', score: 95, maxScore: 100 }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.letterGrade).toBe('A');
      expect(appendImmutableAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GRADE_SUBMISSION', resource: 'Grade' }),
      );
      expect(mockSubmissionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: { status: 'GRADED' },
      });
    });
  });
});
