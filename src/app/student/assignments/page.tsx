import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { StudentAssignmentsClient } from './student-assignments-client';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const user = await requireUser();

  if (user.role !== 'STUDENT') {
    redirect('/');
  }

  return <StudentAssignmentsClient />;
}
