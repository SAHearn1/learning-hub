import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { AuthenticationError, ForbiddenError } from '@/lib/api-errors';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      student: {
        include: {
          iepAccommodations: { where: { active: true } },
        },
      },
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
    throw new AuthenticationError();
  }
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export async function getUserFromClerkId(clerkId: string) {
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
  });
  return user;
}
