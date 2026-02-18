/**
 * Data Retention Management API
 * Admin endpoint for managing data retention enforcement
 */

import { NextResponse } from 'next/server';
import {
  enforceDataRetention,
  getRetentionStatistics,
} from '@/lib/compliance/data-retention';
import { logger } from '@/lib/logger';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET - Get data retention statistics
 */
export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PLATFORM_ADMIN']);

  const statistics = await getRetentionStatistics();

  return NextResponse.json({
    statistics,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST - Manually trigger data retention enforcement
 */
export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PLATFORM_ADMIN']);

  logger.info('Manual data retention enforcement triggered', {
    userId: user.id,
    requestId: ctx.requestId,
  });

  // Run enforcement
  const result = await enforceDataRetention();

  return NextResponse.json({
    result,
    message: result.success
      ? 'Data retention enforcement completed successfully'
      : 'Data retention enforcement completed with errors',
  });
});
