import { db } from '@/lib/db';
import type { NotificationType, Prisma } from '@prisma/client';

export async function createNotification(params: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.notification.create({ data: params });
}

export async function getNotifications(userId: string, unreadOnly = false) {
  return db.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}
