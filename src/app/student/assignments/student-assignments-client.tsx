'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Calendar,
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Award,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubmissionGrade {
  score: number;
  percentage: number;
  letterGrade: string | null;
}

interface Submission {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'GRADED';
  content?: string | null;
  submittedAt: string;
  grade?: SubmissionGrade | null;
}

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  dueDate: string | null;
  points: number;
  published: boolean;
  createdAt: string;
  submissions?: Submission[];
  _count: { submissions: number };
}

type AssignmentType =
  | 'HOMEWORK'
  | 'QUIZ'
  | 'TEST'
  | 'PROJECT'
  | 'DISCUSSION'
  | 'FIVE_R_SESSION';

const TYPE_LABELS: Record<AssignmentType, string> = {
  HOMEWORK: 'Homework',
  QUIZ: 'Quiz',
  TEST: 'Test',
  PROJECT: 'Project',
  DISCUSSION: 'Discussion',
  FIVE_R_SESSION: '5R Session',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentAssignmentsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Class selector
  const [classId, setClassId] = useState('');

  // Expanded assignment for submission
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Submission form
  const [submitContent, setSubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchAssignments = useCallback(async () => {
    if (!classId.trim()) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/lms/assignments?classId=${encodeURIComponent(classId)}&studentView=true`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to load assignments (${res.status})`);
      }
      const json = await res.json();
      setAssignments(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  // -----------------------------------------------------------------------
  // Submit work
  // -----------------------------------------------------------------------

  const handleSubmit = async (assignmentId: string) => {
    if (!submitContent.trim()) {
      setSubmitError('Please enter your work before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/lms/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          content: submitContent.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Submission failed (${res.status})`);
      }

      setSubmitSuccess('Your work has been submitted successfully.');
      setSubmitContent('');
      await fetchAssignments();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const formatDate = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const typeLabel = (t: string) =>
    TYPE_LABELS[t as AssignmentType] ?? t;

  const getSubmission = (a: Assignment): Submission | null =>
    a.submissions && a.submissions.length > 0 ? a.submissions[0] : null;

  const statusBadge = (sub: Submission | null) => {
    if (!sub) {
      return <Badge variant="outline">Not Submitted</Badge>;
    }
    switch (sub.status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'SUBMITTED':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Submitted
          </Badge>
        );
      case 'RETURNED':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Returned
          </Badge>
        );
      case 'GRADED':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Award className="mr-1 h-3 w-3" />
            Graded
          </Badge>
        );
      default:
        return <Badge variant="outline">{sub.status}</Badge>;
    }
  };

  const isDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return diff > 0 && diff < 48 * 60 * 60 * 1000; // 48 hours
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">My Assignments</h1>
        <p className="mt-1 text-neutral-600">
          View your assignments, submit work, and check your grades.
        </p>
      </div>

      {/* Class ID input */}
      <Card>
        <CardContent className="pt-6">
          <label htmlFor="classId" className="mb-1 block text-sm font-medium text-neutral-700">
            Class ID
          </label>
          <input
            id="classId"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Enter your class ID to view assignments"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      {/* States */}
      {!classId.trim() && (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
          <ClipboardList className="h-10 w-10" />
          <p className="text-sm">Enter your class ID above to see assignments.</p>
        </div>
      )}

      {classId.trim() && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0C3B2E]" />
          <span className="ml-2 text-sm text-neutral-600">Loading assignments...</span>
        </div>
      )}

      {classId.trim() && error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {classId.trim() && !loading && !error && assignments.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
          <FileText className="h-10 w-10" />
          <p className="text-sm">No assignments available for this class yet.</p>
        </div>
      )}

      {/* Assignment list */}
      {!loading && !error && assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map((a) => {
            const sub = getSubmission(a);
            const expanded = expandedId === a.id;
            const dueSoon = isDueSoon(a.dueDate);
            const overdue = isOverdue(a.dueDate);

            return (
              <Card key={a.id} className={dueSoon && !sub ? 'border-amber-300' : ''}>
                {/* Clickable header */}
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setExpandedId(expanded ? null : a.id);
                    setSubmitContent(sub?.content ?? '');
                    setSubmitError(null);
                    setSubmitSuccess(null);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-[#0C3B2E]" />
                        <div>
                          <CardTitle className="text-base">{a.title}</CardTitle>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {formatDate(a.dueDate)}
                              {dueSoon && !sub && (
                                <span className="ml-1 font-medium text-amber-600">
                                  (Due soon)
                                </span>
                              )}
                              {overdue && !sub && (
                                <span className="ml-1 font-medium text-red-600">
                                  (Overdue)
                                </span>
                              )}
                            </span>
                            <span>{typeLabel(a.type)}</span>
                            <span>{a.points} pts</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(sub)}
                        {sub?.grade && (
                          <Badge className="bg-[#C9A23E]/20 text-[#8B6F1A] hover:bg-[#C9A23E]/20">
                            {sub.grade.letterGrade ?? `${Math.round(sub.grade.percentage)}%`}
                          </Badge>
                        )}
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* Expanded content */}
                {expanded && (
                  <CardContent className="border-t pt-4">
                    {/* Description */}
                    {a.description && (
                      <p className="mb-4 text-sm text-neutral-600">{a.description}</p>
                    )}

                    {/* Grade & feedback section */}
                    {sub?.status === 'GRADED' && sub.grade && (
                      <div className="mb-4 rounded-md bg-green-50 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-green-800">
                          <Award className="h-4 w-4" />
                          Grade
                        </h4>
                        <div className="mt-2 flex gap-6 text-sm text-green-700">
                          <span>Score: {sub.grade.score}/{a.points}</span>
                          <span>{Math.round(sub.grade.percentage)}%</span>
                          {sub.grade.letterGrade && (
                            <span>Letter: {sub.grade.letterGrade}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submission form -- only show when not yet graded */}
                    {sub?.status !== 'GRADED' && (
                      <div className="space-y-3">
                        <label htmlFor={`submit-${a.id}`} className="block text-sm font-medium text-neutral-700">
                          {sub ? 'Update your submission' : 'Submit your work'}
                        </label>
                        <Textarea
                          id={`submit-${a.id}`}
                          value={submitContent}
                          onChange={(e) => setSubmitContent(e.target.value)}
                          placeholder="Type or paste your work here..."
                          rows={5}
                        />

                        {submitError && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {submitError}
                          </div>
                        )}

                        {submitSuccess && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            {submitSuccess}
                          </div>
                        )}

                        <Button
                          onClick={() => void handleSubmit(a.id)}
                          disabled={submitting}
                          className="bg-[#0C3B2E] hover:bg-[#0C3B2E]/90"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              {sub ? 'Resubmit' : 'Submit'}
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Already submitted & awaiting grade */}
                    {sub?.status === 'SUBMITTED' && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                        <MessageSquare className="h-4 w-4" />
                        Your submission is awaiting review.
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
