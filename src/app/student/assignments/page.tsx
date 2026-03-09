import { requirePageUser } from '@/lib/page-auth';
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

  await requirePageUser(['STUDENT']);

  return <StudentAssignmentsClient />;
}
