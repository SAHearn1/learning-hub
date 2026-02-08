'use client';

import { AssessmentHistory } from '@/components/assessments/AssessmentHistory';
import { EducatorReviewQueue } from '@/components/assessments/EducatorReviewQueue';
import { useAssessmentContext } from '@/hooks/useAssessmentContext';

export default function AssessmentHistoryPage() {
  const { context, loading } = useAssessmentContext();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Assessment History</h1>
        <p className="text-muted-foreground">
          Review past assessments, scoring rubrics, and educator feedback workflows.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading assessment records...</p> : null}
      {context?.studentId ? <AssessmentHistory studentId={context.studentId} /> : null}
      <div className="mt-6">
        <EducatorReviewQueue />
      </div>
    </div>
  );
}
