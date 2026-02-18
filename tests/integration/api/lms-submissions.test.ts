import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockSubmissionFindUnique = vi.fn();
const mockSubmissionFindMany = vi.fn();
const mockSubmissionUpsert = vi.fn();
const mockClassEnrollmentFindUnique = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    assignment: { findUnique: mockAssignmentFindUnique },
    submission: {
      findUnique: mockSubmissionFindUnique,
      findMany: mockSubmissionFindMany,
      upsert: mockSubmissionUpsert,
    },
    classEnrollment: {
      findUnique: mockClassEnrollmentFindUnique,
    },
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

const studentUser = { id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT', student: { id: 'stu_1' } };
const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };
const parentUser = {
  id: 'user_par', tenantId: 'tenant_1', role: 'PARENT',
  parent: { id: 'par_1', childrenIds: ['user_child_1'] },
};

describe('/api/lms/submissions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { AuthenticationError } = await import('@/lib/api-errors');
      mockRequireUser.mockRejectedValue(new AuthenticationError());
      const { GET } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions?assignmentId=a1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it('returns 400 when assignmentId missing', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      const { GET } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when assignment not found', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockAssignmentFindUnique.mockResolvedValue(null);
      const { GET } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions?assignmentId=a_missing');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(404);
    });

    it('student sees only own submission', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockAssignmentFindUnique.mockResolvedValue({ id: 'a1', tenantId: 'tenant_1', class: {} });
      const sub = { id: 'sub_1', content: 'My answer', grade: null };
      mockSubmissionFindUnique.mockResolvedValue(sub);
      const { GET } = await import('@/app/api/lms/submissions/route');

      const req = new NextRequest('http://localhost/api/lms/submissions?assignmentId=a1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('sub_1');
    });

    it('parent sees children submissions', async () => {
      mockRequireUser.mockResolvedValue(parentUser);
      mockAssignmentFindUnique.mockResolvedValue({ id: 'a1', tenantId: 'tenant_1', class: {} });
      mockSubmissionFindMany.mockResolvedValue([{ id: 'sub_c1', content: 'Child answer' }]);
      const { GET } = await import('@/app/api/lms/submissions/route');

      const req = new NextRequest('http://localhost/api/lms/submissions?assignmentId=a1');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });

    it('educator sees all submissions', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockAssignmentFindUnique.mockResolvedValue({ id: 'a1', tenantId: 'tenant_1', class: {} });
      mockSubmissionFindMany.mockResolvedValue([
        { id: 'sub_1' }, { id: 'sub_2' }, { id: 'sub_3' },
      ]);
      const { GET } = await import('@/app/api/lms/submissions/route');

      const req = new NextRequest('http://localhost/api/lms/submissions?assignmentId=a1');
      const res = await GET(req, { params: Promise.resolve({}) });
      const body = await res.json();
      expect(body.data).toHaveLength(3);
    });
  });

  describe('POST', () => {
    it('returns 403 for non-STUDENT', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const { POST } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: 'a1', content: 'Answer' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns 404 when assignment not found', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockAssignmentFindUnique.mockResolvedValue(null);
      const { POST } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: 'a_missing', content: 'Answer' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(404);
    });

    it('returns 403 for unpublished assignment', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockAssignmentFindUnique.mockResolvedValue({ id: 'a1', tenantId: 'tenant_1', published: false });
      const { POST } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: 'a1', content: 'Answer' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('creates submission with audit log and returns 201', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockAssignmentFindUnique.mockResolvedValue({ id: 'a1', tenantId: 'tenant_1', published: true, classId: 'cls_1' });
      mockClassEnrollmentFindUnique.mockResolvedValue({ status: 'ACTIVE' });
      mockSubmissionUpsert.mockResolvedValue({ id: 'sub_new', assignmentId: 'a1', studentId: 'stu_1', status: 'SUBMITTED' });
      const { POST } = await import('@/app/api/lms/submissions/route');
      const { appendImmutableAuditLog } = await import('@/lib/audit');

      const req = new NextRequest('http://localhost/api/lms/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: 'a1', content: 'My work' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
      expect(appendImmutableAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUBMIT_ASSIGNMENT', resource: 'Submission' }),
      );
    });

    it('returns 403 when student is not enrolled in assignment class', async () => {
      mockRequireUser.mockResolvedValue(studentUser);
      mockAssignmentFindUnique.mockResolvedValue({ id: 'a1', tenantId: 'tenant_1', published: true, classId: 'cls_1' });
      mockClassEnrollmentFindUnique.mockResolvedValue(null);

      const { POST } = await import('@/app/api/lms/submissions/route');
      const req = new NextRequest('http://localhost/api/lms/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: 'a1', content: 'My work' }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });
  });
});
