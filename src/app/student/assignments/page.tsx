import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { StudentAssignmentsClient } from './student-assignments-client';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 px-6 py-10">
        <h1 className="text-2xl font-bold text-[#0C3B2E]">Setup Required</h1>
        <p className="text-sm text-neutral-700">
          This environment is missing <code className="rounded bg-neutral-100 px-1">DATABASE_URL</code>, so assignments
          cannot load.
        </p>
      </main>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('StudentAssignments: failed to get user, falling back to /learn', err);
    redirect('/learn');
  }
  if (!user) redirect('/sign-in');

  if (user.role !== 'STUDENT') {
    redirect('/');
  }

  return <StudentAssignmentsClient />;
}
