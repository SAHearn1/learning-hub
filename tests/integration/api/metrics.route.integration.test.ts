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

  it('returns prometheus format by default', async () => {
    incrementMetric('api_request_total');

    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics');
    const response = await GET(req);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(text).toContain('# TYPE');
  });

  it('tracks multiple metric increments correctly', async () => {
    incrementMetric('api_request_total');
    incrementMetric('api_request_total');
    incrementMetric('api_request_total');

    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics?format=json');
    const response = await GET(req);
    const data = await response.json();

    expect(data.counters.api_request_total).toBe(3);
  });

  it('handles empty metrics gracefully', async () => {
    const { GET } = await import('@/app/api/metrics/route');
    const req = new NextRequest('http://localhost:3000/api/metrics?format=json');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.counters).toBeDefined();
  });
});
