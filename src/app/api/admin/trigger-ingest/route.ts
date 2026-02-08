import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError } from '@/lib/api-errors';

export const POST = withApiHandler(async (req, ctx) => {
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

  const body = await req.json();

  // Securely call the ingest endpoint with the webhook secret
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': webhookSecret ? `Bearer ${webhookSecret}` : '',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (response.ok) {
    return NextResponse.json(data);
  } else {
    return NextResponse.json(
      { error: data.error || 'Failed to trigger ingestion' },
      { status: response.status }
    );
  }
}, { rateLimit: { windowMs: 60_000, max: 30 } });
