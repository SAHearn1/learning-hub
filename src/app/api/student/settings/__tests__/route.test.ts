import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockDb = {
  user: { update: vi.fn(), findUnique: vi.fn() },
  student: { update: vi.fn() },
};
const mockAuditLog = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: mockRequireUser }));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/audit', () => ({ appendImmutableAuditLog: mockAuditLog }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));
vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}));

const routeContext = { params: Promise.resolve({}) };

describe('student settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      role: 'STUDENT',
      firstName: 'Alex',
      lastName: 'Student',
      student: {
        id: 'student_1',
        learningPreferences: {},
        regulationProfile: {},
      },
    });
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      firstName: 'Alex',
      lastName: 'Student',
      student: {
        id: 'student_1',
        learningPreferences: {},
        regulationProfile: {},
      },
    });
  });

  it('returns normalized settings for student users', async () => {
    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost/api/student/settings');

    const response = await GET(request, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({
      firstName: 'Alex',
      lastName: 'Student',
      learningPreferences: expect.objectContaining({
        preferredSubjects: [],
        pace: 'GUIDED',
      }),
    }));
  });

  it('persists settings updates and writes an audit log', async () => {
    const { PATCH } = await import('../route');
    const request = new NextRequest('http://localhost/api/student/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Jordan',
        learningPreferences: {
          preferredSubjects: ['MATH', 'SCIENCE'],
          pace: 'CHALLENGE',
          accessibility: { textToSpeech: true },
        },
        regulationProfile: {
          calmingStrategies: ['Box breathing'],
          preferredBreakDuration: 7,
        },
      }),
    });

    const response = await PATCH(request, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockDb.user.update).toHaveBeenCalled();
    expect(mockDb.student.update).toHaveBeenCalled();
    expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'STUDENT_SETTINGS_UPDATED',
      resource: 'STUDENT_SETTINGS',
    }));
    expect(body.data.firstName).toBe('Alex');
  });
});
