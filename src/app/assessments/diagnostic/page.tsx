'use client';

import { DiagnosticAssessment } from '@/components/assessments/DiagnosticAssessment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssessmentContext } from '@/hooks/useAssessmentContext';

export default function DiagnosticPage() {
  const { context, loading } = useAssessmentContext();

  const handleComplete = (results: any) => {
    console.log('Diagnostic assessment completed:', results);
    // Navigate to results page or dashboard
  };

  if (loading || !context) {
    return <div className="container mx-auto max-w-4xl px-4 py-8 text-sm text-muted-foreground">Preparing assessment context...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Diagnostic Assessment</h1>
        <p className="text-muted-foreground">
          Let&apos;s find out what you already know and where we can help you grow! This assessment will
          help us understand your current level and create a personalized learning path.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Before You Begin</CardTitle>
          <CardDescription>Important information about this assessment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <p className="text-sm">Take your time - there&apos;s no time limit</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <p className="text-sm">Show your thinking process, even if you&apos;re not sure</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <p className="text-sm">You can ask for hints if you need help</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <p className="text-sm">This helps us, not hurt you - do your best!</p>
          </div>
        </CardContent>
      </Card>

      <DiagnosticAssessment
        studentId={context.studentId}
        sessionId={context.sessionId}
        subject={context.subject}
        gradeLevel={context.gradeLevel}
        onComplete={handleComplete}
      />
    </div>
  );
}
