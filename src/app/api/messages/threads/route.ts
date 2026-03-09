import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { createThread, getThreadsForUser } from '@/lib/messaging/messaging.service';

const createSchema = z.object({
  studentId: z.string().min(1),
  educatorId: z.string().min(1),
  subject: z.string().min(1),
});

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const threads = await getThreadsForUser(user.id);
  return NextResponse.json({ data: threads });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();
  const body = createSchema.parse(await req.json());
  const thread = await createThread({
    tenantId: user.tenantId,
    studentId: body.studentId,
    parentId: user.role === 'PARENT' ? user.id : body.educatorId,
    educatorId: user.role === 'EDUCATOR' ? user.id : body.educatorId,
    subject: body.subject,
  });
  return NextResponse.json({ data: thread }, { status: 201 });
});
