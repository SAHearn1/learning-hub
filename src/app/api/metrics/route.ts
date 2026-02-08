import { NextRequest } from 'next/server';
import { renderPrometheusMetrics, getMetricsSnapshot } from '@/lib/api/metrics';

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format');

  if (format === 'json') {
    return new Response(JSON.stringify(getMetricsSnapshot()), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(renderPrometheusMetrics(), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
}
