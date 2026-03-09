import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ValidationError } from '@/lib/api-errors';
import { getNotifications, markAllRead } from '@/lib/notifications/notification.service';

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
  const notifications = await getNotifications(user.id, unreadOnly);
  return NextResponse.json({ data: notifications });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  if (body.action === 'markAllRead') {
    await markAllRead(user.id);
    return NextResponse.json({ success: true });
  }
  throw new ValidationError('Unknown action');
});
