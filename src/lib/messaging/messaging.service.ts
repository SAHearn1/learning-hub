import { db } from '@/lib/db';

export async function createThread(params: {
  tenantId: string;
  studentId: string;
  parentId: string;
  educatorId: string;
  subject: string;
}) {
  return db.messageThread.create({ data: params });
}

export async function sendMessage(params: {
  threadId: string;
  senderId: string;
  body: string;
}) {
  const msg = await db.directMessage.create({ data: params });
  await db.messageThread.update({
    where: { id: params.threadId },
    data: { updatedAt: new Date() },
  });
  return msg;
}

export async function getThreadsForUser(userId: string) {
  return db.messageThread.findMany({
    where: {
      OR: [{ parentId: userId }, { educatorId: userId }],
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getThread(threadId: string) {
  return db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function markMessagesRead(threadId: string, userId: string) {
  return db.directMessage.updateMany({
    where: {
      threadId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
