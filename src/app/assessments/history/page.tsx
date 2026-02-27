import { redirect } from 'next/navigation';
import { AssessmentHistory } from '@/components/assessments/AssessmentHistory';
import { getCurrentUser } from '@/lib/auth';

export default async function AssessmentHistoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const studentId = user.student?.id ?? null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Assessment History</h1>
        <p className="text-muted-foreground">
          Review your past assessments and track your learning progress over time.
        </p>
      </div>

      <AssessmentHistory studentId={studentId ?? undefined} />
    </div>
  );
}
