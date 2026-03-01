import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { markRead } from '@/lib/notifications/notification.service';

export const POST = withApiHandler(async (_req, ctx) => {
  const user = await requireUser();
  await markRead(ctx.params.notificationId, user.id);
  return NextResponse.json({ success: true });
});
