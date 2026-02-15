'use client';

import { useCallback, useEffect, useState } from 'react';
import { AssessmentCard } from '@/components/assessments/AssessmentCard';
import { Button } from '@/components/ui/button';
import type { Subject, BloomsLevel } from '@prisma/client';

interface AssessmentData {
  id: string;
  question: string;
  difficulty: number;
  bloomsLevel: BloomsLevel;
  metadata?: {
    type?: 'multiple_choice' | 'open_ended' | 'problem_solving';
    options?: string[];
    scaffoldHints?: string[];
    correctAnswer?: string;
  };
}

interface FeedbackData {
  isCorrect: boolean;
  score: number;
  feedback: string;
  scaffoldHints?: string[];
}

interface SubjectPretestProps {
  subject: Subject;
  gradeLevel: number;
  onComplete: () => void;
}

type PretestPhase = 'loading' | 'question' | 'feedback' | 'complete' | 'error';

export function SubjectPretest({ subject, gradeLevel, onComplete }: SubjectPretestProps) {
  const [phase, setPhase] = useState<PretestPhase>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [theta, setTheta] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Start pretest on mount
  useEffect(() => {
    let cancelled = false;

    async function startPretest() {
      try {
        const res = await fetch('/api/explore/pretest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, gradeLevel }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // If pretest already completed (409), skip to complete
          if (res.status === 409) {
            if (!cancelled) onComplete();
            return;
          }
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const { data } = await res.json();
        if (cancelled) return;

        setSessionId(data.sessionId);
        setAssessment(parseAssessment(data.assessment));
        setTheta(data.abilityEstimate.theta);
        setQuestionsAnswered(0);
        setPhase('question');
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to start pretest');
          setPhase('error');
        }
      }
    }

    startPretest();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, gradeLevel]);

  const handleSubmitAnswer = useCallback(
    async (assessmentId: string, response: string) => {
      setPhase('loading');
      try {
        // Submit the answer
        const submitRes = await fetch(`/api/assessments/${assessmentId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentResponse: response }),
        });

        if (!submitRes.ok) {
          throw new Error('Failed to submit answer');
        }

        const submitData = await submitRes.json();
        const fb = submitData.data?.feedback;

        setFeedback(fb ? {
          isCorrect: fb.isCorrect,
          score: fb.score,
          feedback: fb.feedback,
          scaffoldHints: fb.scaffoldHints,
        } : null);
        setQuestionsAnswered((prev) => prev + 1);
        setPhase('feedback');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to submit answer');
        setPhase('error');
      }
    },
    [],
  );

  const handleNextQuestion = useCallback(async () => {
    if (!sessionId) return;
    setPhase('loading');

    try {
      const res = await fetch('/api/explore/pretest/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        throw new Error('Failed to get next question');
      }

      const { data } = await res.json();

      if (data.done) {
        setTheta(data.abilityEstimate.theta);
        setQuestionsAnswered(data.questionsAnswered);
        setPhase('complete');
        return;
      }

      setAssessment(parseAssessment(data.assessment));
      setTheta(data.abilityEstimate.theta);
      setQuestionsAnswered(data.questionsAnswered);
      setFeedback(null);
      setPhase('question');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to get next question');
      setPhase('error');
    }
  }, [sessionId]);

  // Progress bar
  const maxQuestions = 15;
  const progress = Math.min(100, (questionsAnswered / maxQuestions) * 100);

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-neutral-600">
          {questionsAnswered === 0 ? 'Preparing your pretest...' : 'Loading next question...'}
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{errorMessage || 'Something went wrong.'}</p>
        <Button className="mt-4" variant="outline" onClick={onComplete}>
          Continue to Topics
        </Button>
      </div>
    );
  }

  if (phase === 'complete') {
    const level = thetaToLevel(theta);
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-4xl">&#10003;</div>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">Pretest Complete!</h2>
          <p className="mt-1 text-sm text-neutral-600">
            You answered {questionsAnswered} questions.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <span className="text-sm font-medium text-neutral-700">Your level:</span>
            <span className="text-sm font-bold" style={{ color: level.color }}>
              {level.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-neutral-600">{level.description}</p>
        </div>
        <div className="flex justify-center">
          <Button size="lg" onClick={onComplete}>
            View Recommended Topics
          </Button>
        </div>
      </div>
    );
  }

  // phase === 'question' or 'feedback'
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
          <span>Question {questionsAnswered + (phase === 'question' ? 1 : 0)}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {assessment && (
        <AssessmentCard
          key={assessment.id}
          assessment={{
            ...assessment,
            type: 'DIAGNOSTIC',
          }}
          onSubmit={handleSubmitAnswer}
          showFeedback={phase === 'feedback' && feedback !== null}
          feedback={feedback ?? undefined}
        />
      )}

      {phase === 'feedback' && (
        <div className="flex justify-center">
          <Button onClick={handleNextQuestion}>
            Next Question
          </Button>
        </div>
      )}
    </div>
  );
}

function parseAssessment(raw: Record<string, unknown>): AssessmentData {
  const metadata = raw.metadata as Record<string, unknown> | null;
  return {
    id: raw.id as string,
    question: raw.question as string,
    difficulty: raw.difficulty as number,
    bloomsLevel: raw.bloomsLevel as BloomsLevel,
    metadata: metadata
      ? {
          type: metadata.type as 'multiple_choice' | 'open_ended' | 'problem_solving' | undefined,
          options: metadata.options as string[] | undefined,
          scaffoldHints: metadata.scaffoldHints as string[] | undefined,
          correctAnswer: metadata.correctAnswer as string | undefined,
        }
      : undefined,
  };
}

function thetaToLevel(theta: number): { label: string; color: string; description: string } {
  if (theta >= 2.0) {
    return { label: 'Advanced', color: '#059669', description: 'You have strong skills in this area. Challenge yourself with complex topics!' };
  }
  if (theta >= 1.0) {
    return { label: 'Proficient', color: '#3B82F6', description: 'You have a solid foundation. Keep building on your strengths!' };
  }
  if (theta >= 0) {
    return { label: 'On Track', color: '#8B5CF6', description: 'You\'re on your way! Focus on the recommended topics to grow.' };
  }
  if (theta >= -1.0) {
    return { label: 'Developing', color: '#F59E0B', description: 'You\'re building understanding. The recommended topics will help you grow.' };
  }
  return { label: 'Getting Started', color: '#EF4444', description: 'Every expert was once a beginner. Let\'s find the right starting point for you!' };
}
