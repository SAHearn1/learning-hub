'use client';

const BLOOMS_LEVELS = [
  { key: 'REMEMBER',    label: 'Remember',    color: 'var(--color-neutral-400)', description: 'Recall facts' },
  { key: 'UNDERSTAND',  label: 'Understand',  color: 'var(--color-info-500)',    description: 'Explain ideas' },
  { key: 'APPLY',       label: 'Apply',       color: 'var(--color-primary-500)', description: 'Use in context' },
  { key: 'ANALYZE',     label: 'Analyze',     color: 'var(--color-secondary-500)', description: 'Break apart' },
  { key: 'EVALUATE',    label: 'Evaluate',    color: 'var(--color-secondary-600)', description: 'Judge & justify' },
  { key: 'CREATE',      label: 'Create',      color: 'var(--color-subject-ela)', description: 'Generate new' },
] as const;

interface Standard {
  masteryLevel: number;
  standard: {
    code: string;
    subject: string;
    description: string;
  };
}

interface Assessment {
  bloomsLevel: string;
  isCorrect: boolean | null;
  score: number | null;
}

interface BloomsTaxonomyProps {
  standards: Standard[];
  assessments?: Assessment[];
}

export function BloomsTaxonomy({ standards, assessments = [] }: BloomsTaxonomyProps) {
  // Compute bloom's distribution from assessments if available
  const bloomsCounts: Record<string, { total: number; correct: number }> = {};
  for (const level of BLOOMS_LEVELS) {
    bloomsCounts[level.key] = { total: 0, correct: 0 };
  }
  for (const a of assessments) {
    if (bloomsCounts[a.bloomsLevel]) {
      bloomsCounts[a.bloomsLevel].total++;
      if (a.isCorrect) bloomsCounts[a.bloomsLevel].correct++;
    }
  }

  const hasAssessments = assessments.length > 0;

  // If no assessments, derive a simple view from mastery levels
  // Higher mastery = likely working at higher Bloom's levels
  const avgMastery = standards.length > 0
    ? standards.reduce((s, e) => s + e.masteryLevel, 0) / standards.length
    : 0;

  // Determine the "current level" the student is primarily working at
  const currentLevelIndex = hasAssessments
    ? (() => {
        let highest = 0;
        for (let i = BLOOMS_LEVELS.length - 1; i >= 0; i--) {
          if (bloomsCounts[BLOOMS_LEVELS[i].key].total > 0) { highest = i; break; }
        }
        return highest;
      })()
    : Math.min(Math.floor(avgMastery / 18), 5);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Bloom&apos;s Taxonomy Progression</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Cognitive complexity of your work — growing from recall toward creation
      </p>

      {/* Pyramid visualization */}
      <div className="mt-5 flex flex-col items-center gap-1">
        {[...BLOOMS_LEVELS].reverse().map((level, reverseIdx) => {
          const idx = BLOOMS_LEVELS.length - 1 - reverseIdx;
          const isActive = idx <= currentLevelIndex;
          const counts = bloomsCounts[level.key];
          const widthPercent = 40 + reverseIdx * 10;
          const accuracy = counts.total > 0 ? Math.round((counts.correct / counts.total) * 100) : null;

          return (
            <div
              key={level.key}
              className="relative flex items-center justify-center rounded-md py-2 text-center transition-all"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: isActive ? level.color : 'var(--color-neutral-100)',
                opacity: isActive ? 1 : 0.5,
              }}
            >
              <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                {level.label}
                {hasAssessments && counts.total > 0 && (
                  <span className="ml-1.5 font-normal">
                    ({counts.correct}/{counts.total}{accuracy !== null ? ` — ${accuracy}%` : ''})
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {!hasAssessments && standards.length > 0 && (
        <p className="mt-3 text-center text-xs text-neutral-400">
          Estimated from average mastery ({Math.round(avgMastery)}%). Complete assessments for precise tracking.
        </p>
      )}
      {!hasAssessments && standards.length === 0 && (
        <p className="mt-3 text-center text-xs text-neutral-400">
          Complete tutoring sessions to see your cognitive growth here.
        </p>
      )}
    </div>
  );
}
