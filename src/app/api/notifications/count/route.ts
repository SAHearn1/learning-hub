import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { getUnreadCount } from '@/lib/notifications/notification.service';

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const count = await getUnreadCount(user.id);
  return NextResponse.json({ count });
});
