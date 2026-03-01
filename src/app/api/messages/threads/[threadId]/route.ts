import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { getThread, sendMessage, markMessagesRead } from '@/lib/messaging/messaging.service';

const sendSchema = z.object({ body: z.string().min(1) });

export const GET = withApiHandler(async (_req, ctx) => {
  const user = await requireUser();
  const thread = await getThread(ctx.params.threadId);
  if (!thread || (thread.parentId !== user.id && thread.educatorId !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await markMessagesRead(thread.id, user.id);
  return NextResponse.json({ data: thread });
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireUser();
  const { body } = sendSchema.parse(await req.json());
  const msg = await sendMessage({
    threadId: ctx.params.threadId,
    senderId: user.id,
    body,
  });
  return NextResponse.json({ data: msg }, { status: 201 });
});
