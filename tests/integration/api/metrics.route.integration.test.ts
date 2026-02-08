import { describe, expect, it, beforeEach } from 'vitest';
import { incrementMetric, resetMetrics } from '@/lib/api/metrics';
import { NextRequest } from 'next/server';

describe('GET /api/metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('returns metrics as json when format=json', async () => {
    incrementMetric('api_request_total');

    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics?format=json');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.counters.api_request_total).toBe(1);
  });
});
