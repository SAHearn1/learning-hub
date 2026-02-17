import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { StudentAssignmentsClient } from './student-assignments-client';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  if (user.role !== 'STUDENT') {
    redirect('/');
  }

  return <StudentAssignmentsClient />;
}
