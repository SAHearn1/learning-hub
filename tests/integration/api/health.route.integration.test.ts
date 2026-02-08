import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn(async () => [1]),
  },
}));

describe('GET /api/health', () => {
  it('returns a healthy status when db query succeeds', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('ok');
  });
});
