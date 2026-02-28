'use client';

import { FormEvent, useState } from 'react';

export type SubmissionRow = {
  id: string;
  submittedAt: string;
  status: string;
  content: string | null;
  student: {
    id: string;
    gradeLevel: number;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  assignment: {
    id: string;
    title: string;
    type: string;
    points: number;
    dueDate: string | null;
    classId: string;
  };
};

type Props = {
  submissions: SubmissionRow[];
};

type GradeResult = {
  submissionId: string;
  score: number;
  letterGrade: string;
};

export function GradesClient({ submissions: initialSubmissions }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradedResults, setGradedResults] = useState<Record<string, GradeResult>>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGrade = async (event: FormEvent<HTMLFormElement>, submissionId: string, maxScore: number) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const score = parseFloat(String(formData.get('score') ?? '0'));
    const feedback = String(formData.get('feedback') ?? '').trim();

    if (isNaN(score) || score < 0 || score > maxScore) {
      setMessage(`Score must be between 0 and ${maxScore}.`);
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/lms/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          score,
          maxScore,
          feedback: feedback || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage((err as { message?: string }).message ?? 'Failed to submit grade.');
        return;
      }

      const { data } = (await res.json()) as { data: { score: number; letterGrade: string | null } };

      setGradedResults((prev) => ({
        ...prev,
        [submissionId]: {
          submissionId,
          score: data.score,
          letterGrade: data.letterGrade ?? '',
        },
      }));

      // Remove the submission from the pending list
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setGradingId(null);
      setMessage('Grade submitted successfully.');
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Grade submissions</h1>
        <p className="mt-2 text-neutral-700">
          Review and grade student submissions that are awaiting evaluation.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">
            Pending grading: {submissions.length}
          </span>
          {Object.keys(gradedResults).length > 0 && (
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-700">
              Graded this session: {Object.keys(gradedResults).length}
            </span>
          )}
        </div>
      </section>

      {message && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          {message}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-neutral-700">All caught up!</p>
          <p className="mt-1 text-sm text-neutral-500">
            There are no submissions awaiting grading.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {submissions.map((submission) => {
            const isGrading = gradingId === submission.id;
            const maxScore = submission.assignment.points;

            return (
              <article
                key={submission.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      {submission.assignment.type}
                    </p>
                    <h2 className="mt-1 font-semibold text-neutral-900">
                      {submission.assignment.title}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-700">
                      Student:{' '}
                      <span className="font-medium">
                        {submission.student.user.firstName} {submission.student.user.lastName}
                      </span>{' '}
                      · Grade {submission.student.gradeLevel}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-neutral-800">
                      Max: {maxScore} pts
                    </p>
                    <p className="text-neutral-500">
                      Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                    {submission.assignment.dueDate && (
                      <p className="text-neutral-400 text-xs">
                        Due {new Date(submission.assignment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {submission.content && (
                  <div className="mt-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                    <p className="mb-1 text-xs font-medium uppercase text-neutral-500">
                      Submission content
                    </p>
                    <p className="whitespace-pre-wrap line-clamp-4">{submission.content}</p>
                  </div>
                )}

                <div className="mt-4">
                  {!isGrading ? (
                    <button
                      onClick={() => {
                        setGradingId(submission.id);
                        setMessage('');
                      }}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Grade this submission
                    </button>
                  ) : (
                    <form
                      onSubmit={(e) => handleGrade(e, submission.id, maxScore)}
                      className="space-y-3"
                    >
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-neutral-700">
                            Score (0–{maxScore})
                          </label>
                          <input
                            name="score"
                            type="number"
                            min={0}
                            max={maxScore}
                            step={0.5}
                            required
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700">
                          Feedback (optional)
                        </label>
                        <textarea
                          name="feedback"
                          rows={3}
                          placeholder="Enter feedback for the student..."
                          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {submitting ? 'Submitting...' : 'Submit grade'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGradingId(null)}
                          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
