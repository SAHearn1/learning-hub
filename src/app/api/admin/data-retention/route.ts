/**
 * Data Retention Management API
 * Admin endpoint for managing data retention enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  enforceDataRetention,
  getRetentionStatistics,
} from '@/lib/compliance/data-retention';
import { logger } from '@/lib/logger';
import { getUserFromClerkId } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET - Get data retention statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only platform admins can access retention data
    const user = await getUserFromClerkId(clerkId);
    if (!user || user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const statistics = await getRetentionStatistics();

    return NextResponse.json({
      statistics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get retention statistics', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Manually trigger data retention enforcement
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only platform admins can trigger retention
    const user = await getUserFromClerkId(clerkId);
    if (!user || user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.info('Manual data retention enforcement triggered', {
      userId: user.id,
      clerkId,
    });

    // Run enforcement
    const result = await enforceDataRetention();

    return NextResponse.json({
      result,
      message: result.success
        ? 'Data retention enforcement completed successfully'
        : 'Data retention enforcement completed with errors',
    });
  } catch (error) {
    logger.error('Failed to run retention enforcement', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
