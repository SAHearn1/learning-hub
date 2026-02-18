'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BookOpen, ClipboardList, Compass, Heart, Loader2, Plus } from 'lucide-react';

export type StudentDashboardData = {
  firstName: string;
  classes: Array<{
    id: string;
    name: string;
    subject: string;
    gradeLevel: number;
    academicYear: string;
    educatorName: string;
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    type: string;
    dueDate: string | null;
    points: number;
    class: { id: string; name: string; subject: string };
    submission: null | {
      id: string;
      status: 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'GRADED';
      submittedAt: string;
      grade: null | { score: number; percentage: number; letterGrade: string | null };
    };
  }>;
  recentSession: null | {
    id: string;
    subject: string;
    startedAt: string;
    endedAt: string | null;
  };
};

export function StudentDashboardClient({ initialData }: { initialData: StudentDashboardData }) {
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData>(initialData);

  const [classId, setClassId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  const joinClass = async () => {
    const trimmed = classId.trim();
    if (!trimmed) {
      setJoinError('Enter a class ID.');
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch('/api/student/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: trimmed }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? body?.message ?? `Join failed (${res.status})`);
      }

      // Lightweight refresh: send the student straight to assignments with the class selected.
      router.push(`/student/assignments?classId=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Join failed');
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="flex flex-col gap-2 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          {greeting}, {data.firstName}
        </h1>
        <p className="text-sm text-neutral-600">
          Pick up where you left off, check assignments, or start a new learning session.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Link href="/learn" className="rounded-xl border border-neutral-200 p-3 hover:bg-neutral-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <BookOpen className="h-4 w-4 text-[#0C3B2E]" />
                Learn
              </div>
              <p className="mt-1 text-xs text-neutral-600">Start a 5R tutoring session</p>
            </Link>
            <Link href="/explore" className="rounded-xl border border-neutral-200 p-3 hover:bg-neutral-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <Compass className="h-4 w-4 text-[#0C3B2E]" />
                Explore
              </div>
              <p className="mt-1 text-xs text-neutral-600">Pretests and topic recommendations</p>
            </Link>
            <Link href="/student/assignments" className="rounded-xl border border-neutral-200 p-3 hover:bg-neutral-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <ClipboardList className="h-4 w-4 text-[#0C3B2E]" />
                Assignments
              </div>
              <p className="mt-1 text-xs text-neutral-600">Submit work and view grades</p>
            </Link>
            <Link href="/regulate" className="rounded-xl border border-neutral-200 p-3 hover:bg-neutral-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <Heart className="h-4 w-4 text-[#0C3B2E]" />
                Calm Corner
              </div>
              <p className="mt-1 text-xs text-neutral-600">Reset and return ready</p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentSession ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                  <Badge variant="outline">{data.recentSession.subject}</Badge>
                  <span className="text-xs text-neutral-500">Started {formatDate(data.recentSession.startedAt)}</span>
                  {data.recentSession.endedAt === null && (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In progress</Badge>
                  )}
                </div>
                <Link
                  href={`/learn?resume=${encodeURIComponent(data.recentSession.id)}`}
                  className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Resume session
                </Link>
              </>
            ) : (
              <p className="text-sm text-neutral-600">No sessions yet. Start your first session in Learn.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <Plus className="h-4 w-4 text-neutral-700" />
                Join a class
              </div>
              <p className="mt-1 text-xs text-neutral-600">Paste a class ID from your educator.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="Class ID"
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <Button onClick={() => void joinClass()} disabled={joining} className="bg-[#0C3B2E] hover:bg-[#0C3B2E]/90">
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join'
                  )}
                </Button>
              </div>
              {joinError && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {joinError}
                </div>
              )}
            </div>

            {data.classes.length === 0 ? (
              <p className="text-sm text-neutral-600">No classes yet. Join one above to see assignments automatically.</p>
            ) : (
              <div className="space-y-2">
                {data.classes.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{c.name}</p>
                      <p className="text-xs text-neutral-600">
                        {c.subject} • Grade {c.gradeLevel} • {c.educatorName || 'Educator'}
                      </p>
                    </div>
                    <Link
                      href={`/student/assignments?classId=${encodeURIComponent(c.id)}`}
                      className="text-sm font-medium text-primary-700 hover:text-primary-900"
                    >
                      Open assignments
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingAssignments.length === 0 ? (
              <p className="text-sm text-neutral-600">No upcoming assignments yet.</p>
            ) : (
              data.upcomingAssignments.map((a) => {
                const overdue = isOverdue(a.dueDate);
                const submitted = Boolean(a.submission);
                return (
                  <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{a.title}</p>
                      <p className="text-xs text-neutral-600">
                        {a.class.name} • Due {formatDate(a.dueDate)}
                        {overdue && !submitted && <span className="ml-2 font-semibold text-red-600">Overdue</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {submitted ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>
                        ) : (
                          <Badge variant="outline">Not submitted</Badge>
                        )}
                        {a.submission?.grade && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {a.submission.grade.letterGrade ?? `${Math.round(a.submission.grade.percentage)}%`}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/student/assignments?classId=${encodeURIComponent(a.class.id)}`}
                      className="text-sm font-medium text-primary-700 hover:text-primary-900"
                    >
                      Open
                    </Link>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

