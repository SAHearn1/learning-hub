import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Auth mock ---
const mockRequireUser = vi.fn();

// --- DB mocks ---
const mockStandardFindMany = vi.fn();
const mockStandardFindUnique = vi.fn();
const mockStandardCreate = vi.fn();
const mockStandardUpdate = vi.fn();
const mockStandardDelete = vi.fn();
const mockTopicFindMany = vi.fn();
const mockTopicCreate = vi.fn();
const mockTopicUpdate = vi.fn();
const mockTopicDelete = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({
  db: {
    standard: {
      findMany: mockStandardFindMany,
      findUnique: mockStandardFindUnique,
      create: mockStandardCreate,
      update: mockStandardUpdate,
      delete: mockStandardDelete,
    },
    topic: {
      findMany: mockTopicFindMany,
      create: mockTopicCreate,
      update: mockTopicUpdate,
      delete: mockTopicDelete,
    },
  },
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

const platformAdminUser = {
  id: 'user_admin',
  tenantId: 'platform',
  role: 'PLATFORM_ADMIN',
};
const studentUser = {
  id: 'user_stu',
  tenantId: 'tenant_1',
  role: 'STUDENT',
};
const educatorUser = {
  id: 'user_edu',
  tenantId: 'tenant_1',
  role: 'EDUCATOR',
};

// ---------------------------------------------------------------------------
// GET /api/curriculum/standards
// ---------------------------------------------------------------------------
describe('GET /api/curriculum/standards', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('is publicly accessible (GET does not require auth)', async () => {
    // The GET handler intentionally skips requireUser for read-only curriculum data
    mockStandardFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
  });

  it('returns all standards without filter', async () => {
    const standards = [
      { id: 'std_1', code: 'M.1.1', framework: 'COMMON_CORE', subject: 'MATH', gradeLevel: [1], domain: 'OA', cluster: 'Ops', description: 'Add', fullText: '', createdAt: new Date(), updatedAt: new Date() },
      { id: 'std_2', code: 'S.2.1', framework: 'NGSS', subject: 'SCIENCE', gradeLevel: [2], domain: 'LS', cluster: 'Life', description: 'Life science', fullText: '', createdAt: new Date(), updatedAt: new Date() },
    ];
    mockStandardFindMany.mockResolvedValue(standards);
    const { GET } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.standards).toHaveLength(2);
  });

  it('filters standards by subject', async () => {
    mockStandardFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards?subject=MATH');
    await GET(req, routeContext);
    expect(mockStandardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subject: 'MATH' }),
      })
    );
  });

  it('filters standards by gradeLevel', async () => {
    mockStandardFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards?gradeLevel=5');
    await GET(req, routeContext);
    expect(mockStandardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gradeLevel: { has: 5 } }),
      })
    );
  });

  it('returns empty list when no standards match filters', async () => {
    mockStandardFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards?subject=FINANCIAL_LITERACY&gradeLevel=12');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.standards).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/curriculum/standards
// ---------------------------------------------------------------------------
describe('POST /api/curriculum/standards', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const validStandardBody = {
    code: 'M.3.OA.1',
    framework: 'COMMON_CORE',
    subject: 'MATH',
    gradeLevel: [3],
    domain: 'OA',
    cluster: 'Represent and solve problems',
    description: 'Interpret products of whole numbers',
    fullText: 'Interpret products of whole numbers, e.g., interpret 5 × 7',
  };

  it('returns 403 for non-PLATFORM_ADMIN role', async () => {
    mockRequireUser.mockResolvedValue(educatorUser);
    const { POST } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards', {
      method: 'POST',
      body: JSON.stringify(validStandardBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    const { POST } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards', {
      method: 'POST',
      body: JSON.stringify({ code: '' }), // missing required fields
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it('returns 409 when standard code already exists', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    mockStandardFindUnique.mockResolvedValue({ id: 'std_existing', code: 'M.3.OA.1' });
    const { POST } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards', {
      method: 'POST',
      body: JSON.stringify(validStandardBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(409);
  });

  it('creates standard and returns 201 for PLATFORM_ADMIN', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    mockStandardFindUnique.mockResolvedValue(null);
    mockStandardCreate.mockResolvedValue({ id: 'std_new', ...validStandardBody });
    const { POST } = await import('@/app/api/curriculum/standards/route');
    const req = new NextRequest('http://localhost/api/curriculum/standards', {
      method: 'POST',
      body: JSON.stringify(validStandardBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message).toMatch(/standard created/i);
    expect(body.standard.id).toBe('std_new');
  });
});

// ---------------------------------------------------------------------------
// GET /api/curriculum/topics
// ---------------------------------------------------------------------------
describe('GET /api/curriculum/topics', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('is publicly accessible (GET does not require auth)', async () => {
    // The GET handler intentionally skips requireUser for read-only curriculum data
    mockTopicFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
  });

  it('returns all topics without filter', async () => {
    const topics = [
      { id: 'top_1', name: 'Addition', subject: 'MATH', gradeLevel: [1, 2], description: '', learningObjectives: [], estimatedDuration: 30, createdAt: new Date(), updatedAt: new Date() },
      { id: 'top_2', name: 'Cell Biology', subject: 'SCIENCE', gradeLevel: [7], description: '', learningObjectives: [], estimatedDuration: 45, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockTopicFindMany.mockResolvedValue(topics);
    const { GET } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topics).toHaveLength(2);
  });

  it('filters topics by subject', async () => {
    mockTopicFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics?subject=SCIENCE');
    await GET(req, routeContext);
    expect(mockTopicFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subject: 'SCIENCE' }),
      })
    );
  });

  it('filters topics by gradeLevel', async () => {
    mockTopicFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics?gradeLevel=7');
    await GET(req, routeContext);
    expect(mockTopicFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gradeLevel: { has: 7 } }),
      })
    );
  });

  it('returns empty list when no topics match combined filters', async () => {
    mockTopicFindMany.mockResolvedValue([]);
    const { GET } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics?subject=LANGUAGE_ARTS&gradeLevel=11');
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/curriculum/topics
// ---------------------------------------------------------------------------
describe('POST /api/curriculum/topics', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const validTopicBody = {
    name: 'Photosynthesis',
    subject: 'SCIENCE',
    gradeLevel: [6, 7],
    description: 'How plants make food',
    conceptualUnderstanding: 'Understanding energy conversion',
    commonMisconceptions: ['Plants get food from soil'],
    realWorldConnections: ['Agriculture'],
    learningObjectives: ['Describe the process'],
    estimatedDuration: 60,
  };

  it('returns 403 for STUDENT role', async () => {
    mockRequireUser.mockResolvedValue(studentUser);
    const { POST } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics', {
      method: 'POST',
      body: JSON.stringify(validTopicBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(403);
  });

  it('creates topic and returns 201 for PLATFORM_ADMIN', async () => {
    mockRequireUser.mockResolvedValue(platformAdminUser);
    mockTopicCreate.mockResolvedValue({ id: 'top_new', name: 'Photosynthesis' });
    const { POST } = await import('@/app/api/curriculum/topics/route');
    const req = new NextRequest('http://localhost/api/curriculum/topics', {
      method: 'POST',
      body: JSON.stringify(validTopicBody),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message).toMatch(/topic created/i);
    expect(body.topic.id).toBe('top_new');
  });
});
