import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn(async () => [1]),
  },
}));

describe('GET /api/health', () => {
  it('returns a healthy status when db query succeeds', async () => {
    const { GET } = await import('@/app/api/health/route');
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('ok');
  });

  it('returns unhealthy status when database check fails', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.$queryRaw).mockRejectedValueOnce(new Error('Database connection failed'));

    const { GET } = await import('@/app/api/health/route');
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.checks.database).toBe('unreachable');
  });

  it('includes timestamp in response', async () => {
    const { GET } = await import('@/app/api/health/route');
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(data.checks.timestamp).toBeDefined();
    expect(typeof data.checks.timestamp).toBe('string');
  });
});
