'use client';

import { Suspense } from 'react';
import { FormativeCheck } from '@/components/assessments/FormativeCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';

function FormativePageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'session-123';
  const topic = searchParams.get('topic') || 'Fractions and Equivalent Forms';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Formative In-Session Check</h1>
        <p className="text-muted-foreground">
          Quick checks during learning to adapt instruction in real time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>Low-stakes check for immediate feedback</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• One targeted question generated from the current topic.</p>
          <p>• Immediate AI feedback, hints, and next-step guidance.</p>
          <p>• Results are saved to assessment history.</p>
        </CardContent>
      </Card>

      <FormativeCheck
        sessionId={sessionId}
        currentTopic={topic}
        recentContent={`Current focus area: ${topic}`}
      />
    </div>
  );
}

export default function FormativePage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4 max-w-4xl">Loading...</div>}>
      <FormativePageContent />
    </Suspense>
  );
}
