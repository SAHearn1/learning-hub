import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function getCurrentUser() {
  const { userId } = auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      student: true,
      educator: true,
      parent: true,
      tenant: true,
    },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}
