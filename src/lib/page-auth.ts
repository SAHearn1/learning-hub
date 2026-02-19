import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { featureFlags } from '@/lib/feature-flags';

export async function requirePageUser(allowedRoles?: UserRole[]) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  if (
    featureFlags.strictRoleEnforcement &&
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    redirect('/dashboard');
  }

  return user;
}
