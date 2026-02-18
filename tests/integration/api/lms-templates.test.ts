import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockTemplateFindMany = vi.fn();
const mockTemplateCount = vi.fn();
const mockTemplateCreate = vi.fn();
const mockTemplateFindUnique = vi.fn();
const mockClassFindUnique = vi.fn();
const mockAssignmentCreate = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    fiveRTemplate: {
      findMany: mockTemplateFindMany,
      count: mockTemplateCount,
      create: mockTemplateCreate,
      findUnique: mockTemplateFindUnique,
    },
    class: { findUnique: mockClassFindUnique },
    assignment: { create: mockAssignmentCreate },
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
const makeCtx = (templateId: string) => ({ params: Promise.resolve({ templateId }) });

describe('/api/lms/templates', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { AuthenticationError } = await import('@/lib/api-errors');
      mockRequireUser.mockRejectedValue(new AuthenticationError());
      const { GET } = await import('@/app/api/lms/templates/route');
      const req = new NextRequest('http://localhost/api/lms/templates');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it('returns 403 for STUDENT role', async () => {
      mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
      const { GET } = await import('@/app/api/lms/templates/route');
      const req = new NextRequest('http://localhost/api/lms/templates');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns paginated template list', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      mockTemplateFindMany.mockResolvedValue([
        { id: 't1', name: 'Math 5R Session', subject: 'MATH', _count: { assignments: 2 } },
      ]);
      mockTemplateCount.mockResolvedValue(1);
      const { GET } = await import('@/app/api/lms/templates/route');

      const req = new NextRequest('http://localhost/api/lms/templates?page=1&limit=10');
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe('POST', () => {
    it('returns 403 for PARENT role', async () => {
      mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'PARENT' });
      const { POST } = await import('@/app/api/lms/templates/route');
      const req = new NextRequest('http://localhost/api/lms/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test', subject: 'MATH', gradeLevel: [5],
          phases: [{ phase: 'ROOT', durationMinutes: 10 }],
        }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing phases', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const { POST } = await import('@/app/api/lms/templates/route');
      const req = new NextRequest('http://localhost/api/lms/templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', subject: 'MATH', gradeLevel: [5], phases: [] }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it('creates template with all 5 phases and returns 201', async () => {
      mockRequireUser.mockResolvedValue(educatorUser);
      const phases = [
        { phase: 'ROOT', durationMinutes: 5 },
        { phase: 'REGULATE', durationMinutes: 5 },
        { phase: 'REFLECT', durationMinutes: 15 },
        { phase: 'RESTORE', durationMinutes: 10 },
        { phase: 'RECONNECT', durationMinutes: 10 },
      ];
      const created = {
        id: 't_new', name: 'Full 5R Session', subject: 'MATH',
        gradeLevel: [7], phases, totalDurationMinutes: 45,
      };
      mockTemplateCreate.mockResolvedValue(created);
      const { POST } = await import('@/app/api/lms/templates/route');

      const req = new NextRequest('http://localhost/api/lms/templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'Full 5R Session', subject: 'MATH', gradeLevel: [7], phases }),
      });
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.name).toBe('Full 5R Session');
      expect(mockTemplateCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant_1',
          createdById: 'user_edu',
          totalDurationMinutes: 45,
        }),
      });
    });
  });
});

describe('POST /api/lms/templates/[templateId]/assign', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/lms/templates/[templateId]/assign/route');
    const req = new NextRequest('http://localhost/api/lms/templates/t1/assign', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_1' }),
    });
    const res = await POST(req, makeCtx('t1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { POST } = await import('@/app/api/lms/templates/[templateId]/assign/route');
    const req = new NextRequest('http://localhost/api/lms/templates/t1/assign', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_1' }),
    });
    const res = await POST(req, makeCtx('t1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when template not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockTemplateFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/lms/templates/[templateId]/assign/route');
    const req = new NextRequest('http://localhost/api/lms/templates/t_missing/assign', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_1' }),
    });
    const res = await POST(req, makeCtx('t_missing'));
    expect(res.status).toBe(404);
  });

  it('returns 403 for cross-tenant template', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockTemplateFindUnique.mockResolvedValue({ id: 't1', tenantId: 'tenant_other' });
    const { POST } = await import('@/app/api/lms/templates/[templateId]/assign/route');
    const req = new NextRequest('http://localhost/api/lms/templates/t1/assign', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_1' }),
    });
    const res = await POST(req, makeCtx('t1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when class not found', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockTemplateFindUnique.mockResolvedValue({ id: 't1', tenantId: 'tenant_1', name: 'Math 5R', description: 'Desc', phases: [] });
    mockClassFindUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/lms/templates/[templateId]/assign/route');
    const req = new NextRequest('http://localhost/api/lms/templates/t1/assign', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_missing' }),
    });
    const res = await POST(req, makeCtx('t1'));
    expect(res.status).toBe(404);
  });

  it('creates FIVE_R_SESSION assignment with audit log and returns 201', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockTemplateFindUnique.mockResolvedValue({
      id: 't1', tenantId: 'tenant_1', name: 'Math Regulation', description: 'A 5R math session',
      phases: [{ phase: 'ROOT', durationMinutes: 10 }],
    });
    mockClassFindUnique.mockResolvedValue({ id: 'cls_1', tenantId: 'tenant_1' });
    mockAssignmentCreate.mockResolvedValue({
      id: 'a_new', title: '5R Session: Math Regulation', type: 'FIVE_R_SESSION',
      classId: 'cls_1', templateId: 't1',
    });
    const { POST } = await import('@/app/api/lms/templates/[templateId]/assign/route');
    const { appendImmutableAuditLog } = await import('@/lib/audit');

    const req = new NextRequest('http://localhost/api/lms/templates/t1/assign', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_1', published: true }),
    });
    const res = await POST(req, makeCtx('t1'));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.type).toBe('FIVE_R_SESSION');
    expect(body.data.title).toContain('Math Regulation');
    expect(appendImmutableAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSIGN_5R_TEMPLATE' }),
    );
  });
});
