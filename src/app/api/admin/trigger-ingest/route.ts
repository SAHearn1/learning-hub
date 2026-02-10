import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';

export const POST = withApiHandler(async (req, ctx) => {
  await requireRole(['PLATFORM_ADMIN']);

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
    throw new Error(data.error || 'Failed to trigger ingestion');
  }
});
