import { AssessmentHistory } from '@/components/assessments/AssessmentHistory';

export default function AssessmentHistoryPage() {
  // In a real app, this would come from the session/auth context
  const mockStudentId = 'student-123';

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Assessment History</h1>
        <p className="text-muted-foreground">
          Review your past assessments and track your learning progress over time.
        </p>
      </div>

      <AssessmentHistory studentId={mockStudentId} />
    </div>
  );
}
