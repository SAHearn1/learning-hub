import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { acknowledgeNotice } from '@/lib/safeguards/procedural-safeguards.service';

export const POST = withApiHandler(async (_req, ctx) => {
  const user = await requireUser();

  const { noticeId } = ctx.params;

  const notice = await acknowledgeNotice(noticeId, user.id);

  return NextResponse.json({ data: notice });
});
