'use client';

import { Suspense } from 'react';
import { ThinkingAssessment } from '@/components/assessments/ThinkingAssessment';
import { ReasoningMoveTracker } from '@/components/assessments/ReasoningMoveTracker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { useAssessmentContext } from '@/hooks/useAssessmentContext';

function ThinkingContent() {
  const searchParams = useSearchParams();
  const { context, loading } = useAssessmentContext();
  const studentId = searchParams.get('studentId') || context?.studentId;
  const sessionId = searchParams.get('sessionId') || context?.sessionId;
  const problemContext = searchParams.get('problem')
    || 'A school garden has 3/4 of a plot planted with vegetables and 2/3 planted with herbs in another section. Compare the planted areas and justify your conclusion in two ways.';

  if (loading || !studentId || !sessionId) {
    return <div className="container mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">Preparing assessment context...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Thinking Quality & Creativity Assessment</h1>
        <p className="text-muted-foreground">
          Evaluate reasoning quality, creative flexibility, and reasoning move usage.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thinking challenge</CardTitle>
              <CardDescription>Deep reasoning with creativity scoring</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This flow generates a challenge prompt, evaluates your response, and logs
              detected reasoning moves.
            </CardContent>
          </Card>

          <ThinkingAssessment sessionId={sessionId} problemContext={problemContext} />
        </div>

        <div>
          <ReasoningMoveTracker studentId={studentId} showSuggestions={true} />
        </div>
      </div>
    </div>
  );
}

export default function ThinkingPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4 max-w-6xl">Loading...</div>}>
      <ThinkingContent />
    </Suspense>
  );
}
