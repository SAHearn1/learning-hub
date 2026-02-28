import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * Dashboard router - redirects authenticated users to their role-specific portal.
 * This page is the default landing after Clerk sign-in.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('Dashboard: failed to get user, falling back to /explore', err);
    redirect('/explore');
  }

  if (!user) {
    redirect('/explore');
  }

  switch (user.role) {
    case 'EDUCATOR':
      redirect('/educator/students');
    case 'SCHOOL_ADMIN':
      redirect('/school-admin/dashboard');
    case 'PARENT':
      redirect('/parent/dashboard');
    case 'DISTRICT_ADMIN':
    case 'PLATFORM_ADMIN':
      redirect('/admin/dashboard');
    case 'STUDENT':
      redirect('/student/dashboard');
    default:
      redirect('/explore');
  }
}

