'use client';

import { Suspense } from 'react';
import { SummativeAssessment } from '@/components/assessments/SummativeAssessment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { useAssessmentContext } from '@/hooks/useAssessmentContext';

const DEFAULT_OBJECTIVES = [
  'Solve multi-step problems with clear reasoning',
  'Justify solutions using mathematical evidence',
  'Compare multiple solution strategies',
];

function SummativeContent() {
  const searchParams = useSearchParams();
  const { context, loading } = useAssessmentContext();
  const studentId = searchParams.get('studentId') || context?.studentId;
  const sessionId = searchParams.get('sessionId') || context?.sessionId;
  const topicName = searchParams.get('topic') || 'Fraction Operations';

  if (loading || !studentId || !sessionId) {
    return <div className="container mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">Preparing assessment context...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Summative Mastery Evaluation</h1>
        <p className="text-muted-foreground">
          A comprehensive assessment to measure final mastery and growth.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mastery scoring</CardTitle>
          <CardDescription>Evidence-based final evaluation</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Multi-question assessment across Bloom&apos;s levels.</p>
          <p>• Question-by-question feedback and score summaries.</p>
          <p>• Progress updates for standards linked to the topic.</p>
        </CardContent>
      </Card>

      <SummativeAssessment
        studentId={studentId}
        sessionId={sessionId}
        topicName={topicName}
        learningObjectives={DEFAULT_OBJECTIVES}
      />
    </div>
  );
}

export default function SummativePage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4 max-w-5xl">Loading...</div>}>
      <SummativeContent />
    </Suspense>
  );
}
