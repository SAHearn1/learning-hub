import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getUnreadCount } from '@/lib/notifications/notification.service';

export async function GET() {
  const user = await requireUser();
  const count = await getUnreadCount(user.id);
  return NextResponse.json({ count });
}
