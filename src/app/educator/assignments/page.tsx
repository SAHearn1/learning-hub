import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { EducatorAssignmentsClient } from './educator-assignments-client';

export const dynamic = 'force-dynamic';

const EDUCATOR_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorAssignmentsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  if (!EDUCATOR_ROLES.includes(user.role)) {
    redirect('/');
  }

  return <EducatorAssignmentsClient />;
}
