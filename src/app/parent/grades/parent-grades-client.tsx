'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  User,
  MessageSquare,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GradeAssignment {
  title: string;
  type: string;
  points: number;
  classId: string;
  dueDate: string | null;
}

interface GradeSubmission {
  id: string;
  studentId: string;
  assignment: GradeAssignment;
}

interface Grade {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade: string | null;
  feedback: string | null;
  gradedAt: string;
  submission: GradeSubmission;
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
// Helpers
// ---------------------------------------------------------------------------

function computeGPA(averagePercentage: number): string {
  if (averagePercentage >= 93) return '4.0';
  if (averagePercentage >= 90) return '3.7';
  if (averagePercentage >= 87) return '3.3';
  if (averagePercentage >= 83) return '3.0';
  if (averagePercentage >= 80) return '2.7';
  if (averagePercentage >= 77) return '2.3';
  if (averagePercentage >= 73) return '2.0';
  if (averagePercentage >= 70) return '1.7';
  if (averagePercentage >= 67) return '1.3';
  if (averagePercentage >= 63) return '1.0';
  if (averagePercentage >= 60) return '0.7';
  return '0.0';
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function typeLabel(t: string): string {
  return TYPE_LABELS[t as AssignmentType] ?? t;
}

function letterGradeColor(letter: string | null): string {
  if (!letter) return 'text-neutral-600';
  const first = letter.charAt(0).toUpperCase();
  switch (first) {
    case 'A':
      return 'text-green-700';
    case 'B':
      return 'text-blue-700';
    case 'C':
      return 'text-amber-700';
    case 'D':
      return 'text-orange-700';
    case 'F':
      return 'text-red-700';
    default:
      return 'text-neutral-600';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParentGradesClient() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchGrades = useCallback(async () => {
    if (!studentId.trim()) {
      setGrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/lms/grades?studentId=${encodeURIComponent(studentId)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to load grades (${res.status})`);
      }
      const json = await res.json();
      setGrades(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void fetchGrades();
  }, [fetchGrades]);

  // -----------------------------------------------------------------------
  // Summary stats
  // -----------------------------------------------------------------------

  const totalGraded = grades.length;
  const averagePercentage =
    totalGraded > 0
      ? grades.reduce((sum, g) => sum + g.percentage, 0) / totalGraded
      : 0;
  const gpa = totalGraded > 0 ? computeGPA(averagePercentage) : '--';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">Student Grades</h1>
        <p className="mt-1 text-neutral-600">
          Review your child&apos;s assignment grades, feedback, and overall performance.
        </p>
      </div>

      {/* Student ID input */}
      <Card>
        <CardContent className="pt-6">
          <label htmlFor="studentId" className="mb-1 block text-sm font-medium text-neutral-700">
            <User className="mr-1 inline h-4 w-4" />
            Student ID
          </label>
          <input
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter your child's student ID"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Summary stats */}
      {!loading && !error && totalGraded > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0C3B2E]/10">
                <BookOpen className="h-5 w-5 text-[#0C3B2E]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">Graded</p>
                <p className="text-2xl font-bold text-neutral-900">{totalGraded}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A23E]/10">
                <TrendingUp className="h-5 w-5 text-[#C9A23E]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">Average</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {Math.round(averagePercentage * 10) / 10}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0C3B2E]/10">
                <BarChart3 className="h-5 w-5 text-[#0C3B2E]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">GPA</p>
                <p className="text-2xl font-bold text-neutral-900">{gpa}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* States */}
      {!studentId.trim() && (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
          <Award className="h-10 w-10" />
          <p className="text-sm">Enter a student ID above to view grades.</p>
        </div>
      )}

      {studentId.trim() && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0C3B2E]" />
          <span className="ml-2 text-sm text-neutral-600">Loading grades...</span>
        </div>
      )}

      {studentId.trim() && error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {studentId.trim() && !loading && !error && grades.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
          <BookOpen className="h-10 w-10" />
          <p className="text-sm">No graded assignments found for this student.</p>
        </div>
      )}

      {/* Grade list */}
      {!loading && !error && grades.length > 0 && (
        <div className="space-y-3">
          {grades.map((g) => {
            const expanded = expandedId === g.id;
            return (
              <Card key={g.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(expanded ? null : g.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 shrink-0 text-[#C9A23E]" />
                        <div>
                          <CardTitle className="text-base">
                            {g.submission.assignment.title}
                          </CardTitle>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                            <span>{typeLabel(g.submission.assignment.type)}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Graded: {formatDate(g.gradedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Score */}
                        <div className="text-right">
                          <span className="text-lg font-bold text-neutral-900">
                            {g.score}/{g.maxScore}
                          </span>
                          <p className="text-xs text-neutral-500">
                            {Math.round(g.percentage)}%
                          </p>
                        </div>
                        {/* Letter */}
                        {g.letterGrade && (
                          <span
                            className={`text-2xl font-bold ${letterGradeColor(g.letterGrade)}`}
                          >
                            {g.letterGrade}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* Expanded: feedback */}
                {expanded && g.feedback && (
                  <CardContent className="border-t pt-4">
                    <div className="rounded-md bg-neutral-50 p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                        <MessageSquare className="h-4 w-4" />
                        Educator Feedback
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
                        {g.feedback}
                      </p>
                    </div>
                  </CardContent>
                )}

                {expanded && !g.feedback && (
                  <CardContent className="border-t pt-4">
                    <p className="text-sm text-neutral-500">
                      No written feedback provided for this assignment.
                    </p>
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
