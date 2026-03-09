import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- IRT lib mocks ---
const mockGetStudentAbility = vi.fn();
const mockSelectNextItem = vi.fn();
const mockCalibrateAllItems = vi.fn();
const mockBatchUpdateStudentAbilities = vi.fn();

// --- DB mocks ---
const mockStudentFindUnique = vi.fn();

// --- Auth mock ---
const mockRequireUser = vi.fn();
const mockRequireRole = vi.fn();

// --- Compliance mock (module-level reference so we can flip it in tests) ---
const mockHasRequiredMinorConsent = vi.fn().mockReturnValue(true);

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser, requireRole: mockRequireRole }));
vi.mock('@/lib/db', () => ({
  db: {
    student: { findUnique: mockStudentFindUnique },
  },
}));
vi.mock('@/lib/irt', () => ({
  getStudentAbility: mockGetStudentAbility,
  selectNextItem: mockSelectNextItem,
  calibrateAllItems: mockCalibrateAllItems,
  batchUpdateStudentAbilities: mockBatchUpdateStudentAbilities,
}));
vi.mock('@/lib/irt/ability-estimation', () => ({
  getStudentAbility: mockGetStudentAbility,
}));
vi.mock('@/lib/irt/adaptive-selection', () => ({
  selectNextItem: mockSelectNextItem,
}));
vi.mock('@/lib/compliance', () => ({
  hasRequiredMinorConsent: mockHasRequiredMinorConsent,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({ incrementMetric: vi.fn(), observeLatency: vi.fn() }));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };
const studentUser = { id: 'user_stu', tenantId: 'tenant_1', role: 'STUDENT', isMinor: false, consentStatus: 'GRANTED' };
const studentRecord = { id: 'stu_1', user: { id: 'user_stu', tenantId: 'tenant_1' } };

// ---------------------------------------------------------------------------
// GET /api/irt/ability
// ---------------------------------------------------------------------------
describe('GET /api/irt/ability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true, consentStatus: 'PENDING' });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentId is missing', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when subject is missing', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid subject value', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1&subject=HISTORY');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid subject/i);
  });

  it('returns 404 when student is not found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentFindUnique.mockResolvedValue(null);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_missing&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns 403 when student belongs to a different user (STUDENT role)', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, id: 'user_other' });
    mockStudentFindUnique.mockResolvedValue(studentRecord);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns ability estimate for valid request', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentFindUnique.mockResolvedValue(studentRecord);
    mockGetStudentAbility.mockResolvedValue({
      theta: 0.5,
      standardError: 0.3,
      confidenceIntervalLower: -0.1,
      confidenceIntervalUpper: 1.1,
      reliabilityIndex: 0.9,
    });
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theta).toBe(0.5);
    expect(body.standardError).toBe(0.3);
  });

  it('returns default ability when no estimate exists yet', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentFindUnique.mockResolvedValue(studentRecord);
    mockGetStudentAbility.mockResolvedValue(null);
    const { GET } = await import('@/app/api/irt/ability/route');
    const req = new NextRequest('http://localhost/api/irt/ability?studentId=stu_1&subject=MATH');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theta).toBe(0);
    expect(body.message).toMatch(/no ability estimate/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/irt/next-item
// ---------------------------------------------------------------------------
describe('POST /api/irt/next-item', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRequiredMinorConsent.mockReturnValue(true);
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireUser.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for minor without consent', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, isMinor: true, consentStatus: 'PENDING' });
    mockHasRequiredMinorConsent.mockReturnValue(false);
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when studentId or subject is missing', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when no suitable items found', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentFindUnique.mockResolvedValue(studentRecord);
    mockGetStudentAbility.mockResolvedValue({ theta: 0 });
    mockSelectNextItem.mockResolvedValue(null);
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it('returns selected item for valid request', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentFindUnique.mockResolvedValue(studentRecord);
    mockGetStudentAbility.mockResolvedValue({ theta: 0.5 });
    const selectedItem = { id: 'assess_1', question: 'What is 2+2?', difficulty: 3 };
    mockSelectNextItem.mockResolvedValue(selectedItem);
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('assess_1');
  });

  it('returns 403 when non-student accesses another tenant student', async () => {
    mockRequireUser.mockResolvedValue({ ...studentUser, role: 'EDUCATOR', id: 'user_edu', tenantId: 'tenant_other' });
    mockStudentFindUnique.mockResolvedValue(studentRecord); // student is in tenant_1
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('uses provided currentTheta when specified', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    mockStudentFindUnique.mockResolvedValue(studentRecord);
    const selectedItem = { id: 'assess_2', question: 'Hard question', difficulty: 5 };
    mockSelectNextItem.mockResolvedValue(selectedItem);
    const { POST } = await import('@/app/api/irt/next-item/route');
    const req = new NextRequest('http://localhost/api/irt/next-item', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'stu_1', subject: 'MATH', currentTheta: 1.5 }),
    });
    await POST(req, routeContext);
    // Should NOT call getStudentAbility when currentTheta is provided
    expect(mockGetStudentAbility).not.toHaveBeenCalled();
    expect(mockSelectNextItem).toHaveBeenCalledWith(
      expect.objectContaining({ currentTheta: 1.5 })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/irt/calibrate
// ---------------------------------------------------------------------------
describe('POST /api/irt/calibrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ id: 'educator_1', role: 'EDUCATOR', tenantId: 'tenant_1' });
  });

  it('returns 401 when not authenticated', async () => {
    const { AuthenticationError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new AuthenticationError());
    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role (requires EDUCATOR or higher)', async () => {
    const { ForbiddenError } = await import('@/lib/api-errors');
    mockRequireRole.mockRejectedValue(new ForbiddenError('Insufficient role'));
    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 when subject is missing', async () => {
    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/subject/i);
  });

  it('returns 400 for invalid subject value', async () => {
    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({ subject: 'HISTORY' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns calibration results on success', async () => {
    mockCalibrateAllItems.mockResolvedValue({ calibrated: 10, skipped: 2 });
    mockBatchUpdateStudentAbilities.mockResolvedValue(15);

    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({ subject: 'MATH' }),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Calibration completed successfully');
    expect(body.itemsCalibrated).toBe(10);
    expect(body.itemsSkipped).toBe(2);
    expect(body.studentsUpdated).toBe(15);
  });

  it('uses default minResponses of 30 when not provided', async () => {
    mockCalibrateAllItems.mockResolvedValue({ calibrated: 5, skipped: 0 });
    mockBatchUpdateStudentAbilities.mockResolvedValue(8);

    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({ subject: 'SCIENCE' }),
    });
    await POST(req, routeContext);
    expect(mockCalibrateAllItems).toHaveBeenCalledWith('SCIENCE', 30);
  });

  it('respects custom minResponses param', async () => {
    mockCalibrateAllItems.mockResolvedValue({ calibrated: 3, skipped: 1 });
    mockBatchUpdateStudentAbilities.mockResolvedValue(5);

    const { POST } = await import('@/app/api/irt/calibrate/route');
    const req = new NextRequest('http://localhost/api/irt/calibrate', {
      method: 'POST',
      body: JSON.stringify({ subject: 'LANGUAGE_ARTS', minResponses: 50 }),
    });
    await POST(req, routeContext);
    expect(mockCalibrateAllItems).toHaveBeenCalledWith('LANGUAGE_ARTS', 50);
  });
});
