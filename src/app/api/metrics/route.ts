import { NextResponse } from 'next/server';
import { renderPrometheusMetrics, getMetricsSnapshot } from '@/lib/api/metrics';
import { withApiHandler } from '@/lib/api-handler';

export const GET = withApiHandler(async (req) => {
  const format = req.nextUrl.searchParams.get('format');

  if (format === 'json') {
    return NextResponse.json(getMetricsSnapshot());
  }

  return new Response(renderPrometheusMetrics(), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
}, { rateLimit: { windowMs: 60_000, max: 120 } });
