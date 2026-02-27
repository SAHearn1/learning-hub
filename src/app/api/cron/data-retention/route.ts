import { NextRequest, NextResponse } from 'next/server';
import { enforceDataRetention } from '@/lib/compliance/data-retention';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/data-retention
 *
 * Vercel Cron job endpoint — runs daily at 02:00 UTC.
 * Configured in vercel.json under the "crons" key.
 *
 * Protected by CRON_SECRET: Vercel injects an Authorization header
 * (Bearer <CRON_SECRET>) on every cron invocation. External callers
 * without the secret receive 401.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  logger.info('Data retention cron job started');

  try {
    const result = await enforceDataRetention();
    const durationMs = Date.now() - start;

    logger.info('Data retention cron job completed', { ...result, durationMs });

    return NextResponse.json({
      durationMs,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Data retention cron job failed', { error: message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
