import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { ProgressSummary } from '@/components/progress/progress-summary';
import { MasteryOverview } from '@/components/progress/mastery-overview';
import { MasteryByStandard } from '@/components/progress/mastery-by-standard';
import { GrowthChart } from '@/components/progress/growth-chart';
import { SessionTimeline } from '@/components/progress/session-timeline';
import { ReasoningMoveChart } from '@/components/progress/reasoning-move-chart';
import { BloomsTaxonomy } from '@/components/progress/blooms-taxonomy';
import { ExportButton } from '@/components/progress/export-button';

async function getProgressData() {
  const { userId: clerkId } = auth();
  if (!clerkId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });
  if (!user?.student) return null;

  const studentId = user.student.id;

  const [progressEntries, reasoningMoves, recentSessions, assessments, timedAssessments] = await Promise.all([
    db.progress.findMany({
      where: { studentId },
      include: { standard: true },
      orderBy: { updatedAt: 'desc' },
    }),
    db.reasoningMoveProgress.findMany({
      where: { studentId },
      orderBy: { proficiencyLevel: 'desc' },
    }),
    db.session.findMany({
      where: { studentId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { _count: { select: { messages: true, assessments: true } } },
    }),
    db.assessment.findMany({
      where: { session: { studentId } },
      select: { bloomsLevel: true, isCorrect: true, score: true },
    }),
    db.assessment.findMany({
      where: { session: { studentId } },
      select: {
        score: true,
        isCorrect: true,
        bloomsLevel: true,
        createdAt: true,
        session: { select: { subject: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const totalStandards = progressEntries.length;
  const averageMastery = totalStandards > 0
    ? Math.round((progressEntries.reduce((sum, p) => sum + p.masteryLevel, 0) / totalStandards) * 10) / 10
    : 0;
  const masteredCount = progressEntries.filter(p => p.masteryLevel >= 80).length;
  const inProgressCount = progressEntries.filter(p => p.masteryLevel > 0 && p.masteryLevel < 80).length;

  // Compute streak: count consecutive days (going backwards) that have at least one session
  const sessionDates = new Set(
    recentSessions.map(s => new Date(s.startedAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (sessionDates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    summary: { totalStandards, averageMastery, masteredCount, inProgressCount, totalSessions: recentSessions.length, streak },
    standards: progressEntries.map(p => ({
      masteryLevel: p.masteryLevel,
      assessmentCount: p.assessmentCount,
      standard: { code: p.standard.code, subject: p.standard.subject, description: p.standard.description },
    })),
    reasoningMoves: reasoningMoves.map(m => ({
      move: m.move,
      usageCount: m.usageCount,
      promptedUsage: m.promptedUsage,
      spontaneousUsage: m.spontaneousUsage,
      proficiencyLevel: m.proficiencyLevel,
    })),
    recentSessions: recentSessions.map(s => ({
      id: s.id,
      subject: s.subject,
      currentPhase: s.currentPhase,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      _count: s._count,
    })),
    assessments: assessments.map(a => ({
      bloomsLevel: a.bloomsLevel,
      isCorrect: a.isCorrect,
      score: a.score,
    })),
    growthData: timedAssessments.map(a => ({
      date: a.createdAt.toISOString(),
      score: a.score,
      isCorrect: a.isCorrect,
      bloomsLevel: a.bloomsLevel,
      subject: a.session.subject,
    })),
  };
}

export default async function ProgressPage() {
  const data = await getProgressData();

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-neutral-900">My Progress</h1>
        <p className="mt-3 text-neutral-700">Sign in as a student to view your progress dashboard.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 print:px-2 print:py-4">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">My Progress</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Track your learning journey across standards, thinking skills, and sessions.
          </p>
        </div>
        <ExportButton
          rows={data.standards.map((s) => ({
            standard: s.standard.code,
            subject: s.standard.subject,
            masteryLevel: s.masteryLevel,
            assessmentCount: s.assessmentCount,
          }))}
        />
      </div>

      {/* Summary cards */}
      <section className="mb-8">
        <ProgressSummary summary={data.summary} />
      </section>

      {/* Mastery overview + Growth chart */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <MasteryOverview standards={data.standards} />
        <GrowthChart data={data.growthData} />
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Standards mastery + Bloom's */}
        <div className="space-y-6">
          <MasteryByStandard standards={data.standards} />
          <BloomsTaxonomy standards={data.standards} assessments={data.assessments} />
        </div>

        {/* Right: Reasoning moves + Sessions */}
        <div className="space-y-6">
          <ReasoningMoveChart moves={data.reasoningMoves} />
          <SessionTimeline sessions={data.recentSessions} />
        </div>
      </div>

      {/* Print footer */}
      <div className="mt-6 hidden text-center text-xs text-neutral-400 print:block">
        RootWork Learning Hub Progress Report &mdash; Generated {new Date().toLocaleDateString()}
      </div>
    </main>
  );
}
