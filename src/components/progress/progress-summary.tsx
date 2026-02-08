'use client';

interface SummaryStats {
  totalStandards: number;
  averageMastery: number;
  masteredCount: number;
  inProgressCount: number;
  totalSessions: number;
  streak: number;
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-neutral-400">{detail}</p>}
    </div>
  );
}

export function ProgressSummary({ summary }: { summary: SummaryStats }) {
  const masteryLabel =
    summary.averageMastery >= 80 ? 'Mastered' :
    summary.averageMastery >= 60 ? 'Proficient' :
    summary.averageMastery >= 40 ? 'Developing' :
    summary.averageMastery > 0 ? 'Beginning' :
    'Not started';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Average Mastery"
        value={`${summary.averageMastery}%`}
        detail={masteryLabel}
      />
      <StatCard
        label="Standards Mastered"
        value={summary.masteredCount}
        detail={`of ${summary.totalStandards} tracked`}
      />
      <StatCard
        label="In Progress"
        value={summary.inProgressCount}
        detail="standards developing"
      />
      <StatCard
        label="Total Sessions"
        value={summary.totalSessions}
      />
      <StatCard
        label="Current Streak"
        value={`${summary.streak} day${summary.streak !== 1 ? 's' : ''}`}
        detail={summary.streak > 0 ? 'consecutive days active' : 'start a session today!'}
      />
    </div>
  );
}
