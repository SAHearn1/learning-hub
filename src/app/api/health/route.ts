import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRedisClient } from '@/lib/redis/client';

export async function GET(_req?: Request) {
  const checks: Record<string, string> = {};

  // Database health
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'unreachable';
  }

  // Redis health (optional — degraded is acceptable)
  try {
    const redis = getRedisClient();
    if (redis) {
      const pong = await redis.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'degraded';
    } else {
      checks.redis = 'not_configured';
    }
  } catch {
    checks.redis = 'unreachable';
  }

  checks.api = 'ok';
  checks.timestamp = new Date().toISOString();

  // App is healthy as long as the database is reachable.
  // Redis being down degrades performance but doesn't block operation.
  const healthy = checks.database === 'ok';

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 },
  );
}
