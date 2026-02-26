'use client';

import { DiagnosticAssessment } from '@/components/assessments/DiagnosticAssessment';
import type { Subject } from '@prisma/client';

interface DiagnosticPageClientProps {
  studentId: string;
  sessionId: string;
  subject: Subject;
  gradeLevel: number;
}

export default function DiagnosticPageClient({
  studentId,
  sessionId,
  subject,
  gradeLevel,
}: DiagnosticPageClientProps) {
  const handleComplete = (results: any) => {
    console.log('Diagnostic assessment completed:', results);
    // Navigate to results page or dashboard
  };

  return (
    <DiagnosticAssessment
      studentId={studentId}
      sessionId={sessionId}
      subject={subject}
      gradeLevel={gradeLevel}
      onComplete={handleComplete}
    />
  );
}
