import { NextResponse } from 'next/server';
import { renderPrometheusMetrics, getMetricsSnapshot } from '@/lib/api/metrics';
import { exportMetrics, checkAlerts } from '@/lib/monitoring/metrics';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Serverless-compatible alert evaluation: Vercel functions have no persistent
// background timers, so we evaluate alert conditions each time the metrics
// endpoint is scraped (typically every 60 s by Datadog / Prometheus).
// This ensures alerts fire within one scrape interval of a threshold breach.
async function evaluateAlerts() {
  try {
    await checkAlerts();
  } catch (err) {
    // Never let alert evaluation block or error the metrics response.
    logger.error('Alert evaluation error during metrics scrape', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const GET = withApiHandler(async (req) => {
  await requireRole(['PLATFORM_ADMIN']);
  const format = req.nextUrl.searchParams.get('format');

  // Evaluate alert conditions on every scrape (fire-and-forget, non-blocking).
  void evaluateAlerts();

  if (format === 'json') {
    // Return both the lightweight API counter snapshot and the full
    // monitoring module snapshot (includes AI cost, consent rates, etc.)
    return NextResponse.json({
      ...getMetricsSnapshot(),
      monitoring: exportMetrics(),
    });
  }

  return new Response(renderPrometheusMetrics(), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
}, { rateLimit: { windowMs: 60_000, max: 120 } });
