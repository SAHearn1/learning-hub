'use client';

import { useEffect, useState } from 'react';

type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS';

interface ContextData {
  studentId: string;
  sessionId: string;
  subject: Subject;
  gradeLevel: number;
}

export function useAssessmentContext() {
  const [context, setContext] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContext() {
      setLoading(true);
      const res = await fetch('/api/assessments/context');
      const payload = await res.json();
      if (!res.ok || !payload?.data?.studentId) {
        setLoading(false);
        return;
      }

      const data = payload.data as { studentId: string; gradeLevel: number; subject: Subject; sessionId: string | null };
      let sessionId = data.sessionId;

      if (!sessionId) {
        const createRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: data.subject, engagementMode: 'FORWARD' }),
        });
        const createPayload = await createRes.json();
        sessionId = createPayload?.data?.id ?? null;
      }

      if (sessionId) {
        setContext({
          studentId: data.studentId,
          gradeLevel: data.gradeLevel,
          subject: data.subject,
          sessionId,
        });
      }
      setLoading(false);
    }

    loadContext();
  }, []);

  return { context, loading };
}
