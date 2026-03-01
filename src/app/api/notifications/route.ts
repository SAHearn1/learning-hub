import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getNotifications, markAllRead } from '@/lib/notifications/notification.service';

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
  const notifications = await getNotifications(user.id, unreadOnly);
  return NextResponse.json({ data: notifications });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  if (body.action === 'markAllRead') {
    await markAllRead(user.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
