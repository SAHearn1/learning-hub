import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError } from '@/lib/api-errors';

export const GET = withApiHandler(async (req, ctx) => {
  const { userId: clerkId } = auth();

  if (!clerkId) {
    throw new AuthenticationError();
  }

  // Check if user is admin
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
  });

  if (!user || !['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const logs = await db.ingestLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return NextResponse.json({ logs });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
