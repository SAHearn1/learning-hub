import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';

export const GET = withApiHandler(async (_req, { requestId }) => {
  const checks: Record<string, string> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'unreachable';
  }

  checks.api = 'ok';
  checks.timestamp = new Date().toISOString();

  const healthy = checks.database === 'ok';

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks, requestId },
    { status: healthy ? 200 : 503 },
  );
});
