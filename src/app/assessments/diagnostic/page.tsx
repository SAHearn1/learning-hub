import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Subject } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import DiagnosticPageClient from './DiagnosticPageClient';

interface DiagnosticPageProps {
  searchParams: Promise<{ sessionId?: string; subject?: string; gradeLevel?: string }>;
}

export default async function DiagnosticPage({ searchParams }: DiagnosticPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const studentId = user.student?.id ?? null;
  if (!studentId) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const sessionId = params.sessionId ?? '';
  const subject = (params.subject as Subject) ?? 'MATH';
  const gradeLevel = params.gradeLevel ? parseInt(params.gradeLevel, 10) : (user.student?.gradeLevel ?? 5);

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

      <DiagnosticPageClient
        studentId={studentId}
        sessionId={sessionId}
        subject={subject}
        gradeLevel={gradeLevel}
      />
    </div>
  );
}
