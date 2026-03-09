import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const mockUserFindFirst = vi.fn();
const mockUserFindMany = vi.fn();
const mockUserCreate = vi.fn();
const mockStudentCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
      findMany: mockUserFindMany,
      create: mockUserCreate,
    },
    student: {
      create: mockStudentCreate,
    },
    $transaction: mockTransaction,
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

const districtAdmin = {
  id: 'user_district_admin',
  tenantId: 'tenant_1',
  role: 'DISTRICT_ADMIN',
  email: 'admin@district.edu',
};

const platformAdmin = {
  id: 'user_platform_admin',
  tenantId: 'tenant_1',
  role: 'PLATFORM_ADMIN',
  email: 'admin@platform.com',
};

const schoolAdmin = {
  id: 'user_school_admin',
  tenantId: 'tenant_1',
  role: 'SCHOOL_ADMIN',
  email: 'admin@school.edu',
};

const validStudent = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@school.edu',
  gradeLevel: 7,
  externalId: 'SIS-12345',
  parentEmail: 'parent@email.com',
};

const routeCtx = { params: Promise.resolve({}) };

async function callPost(body: unknown, user = districtAdmin) {
  mockRequireRole.mockResolvedValue(user);
  const { POST } = await import('@/app/api/admin/sis-import/route');
  const req = new NextRequest('http://localhost/api/admin/sis-import', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return POST(req, routeCtx);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/admin/sis-import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // 1. 401 unauthenticated
  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/admin/sis-import/route');

    const req = new NextRequest('http://localhost/api/admin/sis-import', {
      method: 'POST',
      body: JSON.stringify({ students: [validStudent] }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(401);
  });

  // 2. 403 for SCHOOL_ADMIN role
  it('returns 403 for SCHOOL_ADMIN role', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError());
    const { POST } = await import('@/app/api/admin/sis-import/route');

    const req = new NextRequest('http://localhost/api/admin/sis-import', {
      method: 'POST',
      body: JSON.stringify({ students: [validStudent] }),
    });
    const res = await POST(req, routeCtx);
    expect(res.status).toBe(403);
  });

  // 3. 400 when students array is empty
  it('returns 400 when students array is empty', async () => {
    const res = await callPost({ students: [] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // 4. 400 when student missing required fields
  it('returns 400 when student is missing required fields', async () => {
    const res = await callPost({
      students: [{ firstName: 'Jane', email: 'jane@school.edu', gradeLevel: 7 }], // missing lastName
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // 5. 400 when email is invalid
  it('returns 400 when student email is invalid', async () => {
    const res = await callPost({
      students: [{ ...validStudent, email: 'not-an-email' }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // 6. 400 when gradeLevel out of range
  it('returns 400 when gradeLevel is out of range (0)', async () => {
    const res = await callPost({
      students: [{ ...validStudent, gradeLevel: 0 }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when gradeLevel is out of range (13)', async () => {
    const res = await callPost({
      students: [{ ...validStudent, gradeLevel: 13 }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // 7. dryRun=true: returns created/skipped counts without writing
  it('dryRun=true returns counts without writing to DB', async () => {
    mockUserFindMany.mockResolvedValue([]); // no existing users
    const res = await callPost({ students: [validStudent], dryRun: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dryRun).toBe(true);
    expect(body.data.total).toBe(1);
    expect(body.data.created).toBe(1);
    expect(body.data.skipped).toBe(0);
    expect(body.data.errors).toHaveLength(0);
    // Should NOT have called $transaction (no writes)
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // 8. dryRun=true: skips existing emails
  it('dryRun=true marks existing emails as skipped', async () => {
    mockUserFindMany.mockResolvedValue([{ email: validStudent.email }]);
    const res = await callPost({ students: [validStudent], dryRun: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dryRun).toBe(true);
    expect(body.data.created).toBe(0);
    expect(body.data.skipped).toBe(1);
    expect(body.data.errors).toHaveLength(1);
    expect(body.data.errors[0].reason).toBe('Email already exists');
    expect(body.data.errors[0].email).toBe(validStudent.email);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // 9. Real import: creates user+student, returns 201
  it('real import creates user and student profile, returns 201', async () => {
    mockUserFindFirst.mockResolvedValue(null); // no existing user
    const createdUser = { id: 'new_user_1', email: validStudent.email };
    // Simulate $transaction calling the callback and creating records
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue(createdUser) },
        student: { create: vi.fn().mockResolvedValue({ id: 'new_student_1' }) },
      };
      await fn(tx);
    });

    const res = await callPost({ students: [validStudent] });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.total).toBe(1);
    expect(body.data.created).toBe(1);
    expect(body.data.skipped).toBe(0);
    expect(body.data.errors).toHaveLength(0);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  // 10. Real import: skips duplicate email, records in errors array
  it('real import skips duplicate email and records it in errors', async () => {
    const existing = { id: 'existing_user', email: validStudent.email };
    mockUserFindFirst.mockResolvedValue(existing);

    const res = await callPost({ students: [validStudent] });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.total).toBe(1);
    expect(body.data.created).toBe(0);
    expect(body.data.skipped).toBe(1);
    expect(body.data.errors).toHaveLength(1);
    expect(body.data.errors[0].row).toBe(1);
    expect(body.data.errors[0].email).toBe(validStudent.email);
    expect(body.data.errors[0].reason).toBe('Email already exists');
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
