import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * Dashboard router — redirects authenticated users to their role-specific portal.
 * This page is the default landing after Clerk sign-in.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getCurrentUser();

  if (!user) {
    // User exists in Clerk but not yet in DB — getCurrentUser auto-provisions,
    // so this is a rare edge case. Redirect to learn as default.
    redirect('/learn');
  }

  switch (user.role) {
    case 'EDUCATOR':
    case 'SCHOOL_ADMIN':
      redirect('/educator/students');
    case 'PARENT':
      redirect('/parent/dashboard');
    case 'DISTRICT_ADMIN':
      redirect('/admin/dashboard');
    case 'STUDENT':
    default:
      redirect('/learn');
  }
}
