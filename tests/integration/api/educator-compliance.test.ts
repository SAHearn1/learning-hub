import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockAccommodationFindMany = vi.fn();
const mockAccommodationCreate = vi.fn();
const mockAssertTenantAccess = vi.fn();
const mockAppendAuditLog = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { findUnique: mockStudentFindUnique, findMany: mockStudentFindMany },
    iepAccommodation: { findMany: mockAccommodationFindMany, create: mockAccommodationCreate },
  },
}));
vi.mock('@/lib/rbac', () => ({ assertTenantAccess: mockAssertTenantAccess }));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAppendAuditLog }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(), captureException: vi.fn(), recordMetric: vi.fn(), trackEvent: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };
const educatorUser = { id: 'user_edu', tenantId: 'tenant_1', role: 'EDUCATOR' };

describe('GET /api/educator/compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'STUDENT' });
    const { GET } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 403 for PARENT role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'PARENT' });
    const { GET } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns accommodations for a specific studentId', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({ id: 'stu_1', user: { tenantId: 'tenant_1' } });
    mockAssertTenantAccess.mockReturnValue(undefined);
    mockAccommodationFindMany.mockResolvedValue([
      { id: 'acc_1', studentId: 'stu_1', type: 'EXTENDED_TIME', description: 'Extra time on tests' },
    ]);
    const { GET } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('EXTENDED_TIME');
  });

  it('returns 403 when studentId belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({ id: 'stu_1', user: { tenantId: 'tenant_other' } });
    mockAssertTenantAccess.mockImplementation(() => { throw new Error('Tenant mismatch'); });
    const { GET } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns all students with active accommodations when no studentId', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindMany.mockResolvedValue([
      {
        id: 'stu_1',
        user: { firstName: 'Alice', lastName: 'Smith' },
        iepAccommodations: [{ id: 'acc_1', type: 'EXTENDED_TIME', active: true }],
      },
    ]);
    const { GET } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].user.firstName).toBe('Alice');
  });
});

describe('POST /api/educator/compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditLog.mockResolvedValue(undefined);
  });

  const validBody = {
    studentId: 'stu_1',
    type: 'EXTENDED_TIME',
    description: 'Extra time on timed assessments',
    parameters: {},
    startDate: '2026-01-15',
  };

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for DISTRICT_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue({ id: 'u1', tenantId: 'tenant_1', role: 'DISTRICT_ADMIN' });
    const { POST } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid accommodation type', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, type: 'INVALID_TYPE' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 403 when student belongs to different tenant', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({ id: 'stu_1', user: { tenantId: 'tenant_other' } });
    const { POST } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 201 and creates accommodation with audit log', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    mockStudentFindUnique.mockResolvedValue({ id: 'stu_1', user: { tenantId: 'tenant_1' } });
    mockAccommodationCreate.mockResolvedValue({
      id: 'acc_new',
      studentId: 'stu_1',
      type: 'EXTENDED_TIME',
      description: 'Extra time on timed assessments',
    });
    const { POST } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.id).toBe('acc_new');
    expect(body.data.type).toBe('EXTENDED_TIME');

    expect(mockAppendAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        action: 'CREATE_ACCOMMODATION',
        resource: 'IepAccommodation',
        resourceId: 'acc_new',
      }),
    );
  });

  it('returns 400 when required fields are missing', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/educator/compliance/route');

    const req = new NextRequest('http://localhost/api/educator/compliance', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });
});
