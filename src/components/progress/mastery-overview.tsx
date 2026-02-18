'use client';

interface Standard {
  masteryLevel: number;
  assessmentCount: number;
  standard: {
    code: string;
    subject: string;
    description: string;
  };
}

const TIERS = [
  { label: 'Mastered', min: 80, color: '#22c55e' },
  { label: 'Proficient', min: 60, color: '#3b82f6' },
  { label: 'Developing', min: 40, color: '#f59e0b' },
  { label: 'Beginning', min: 0, color: '#ef4444' },
] as const;

function classifyTier(mastery: number): (typeof TIERS)[number] {
  for (const tier of TIERS) {
    if (mastery >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export function MasteryOverview({ standards }: { standards: Standard[] }) {
  if (standards.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Mastery Overview</h2>
        <p className="mt-3 text-sm text-neutral-500">
          No standards tracked yet. Start a tutoring session to see your mastery breakdown.
        </p>
      </div>
    );
  }

  // Count standards per tier
  const tierCounts = TIERS.map((tier) => ({
    ...tier,
    count: standards.filter((s) => classifyTier(s.masteryLevel) === tier).length,
  }));

  const total = standards.length;

  // SVG donut chart dimensions
  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Build arc segments
  let cumulativePercent = 0;
  const segments = tierCounts
    .filter((t) => t.count > 0)
    .map((tier) => {
      const percent = tier.count / total;
      const dashArray = `${circumference * percent} ${circumference * (1 - percent)}`;
      const dashOffset = -circumference * cumulativePercent;
      cumulativePercent += percent;
      return { ...tier, percent, dashArray, dashOffset };
    });

  // Average mastery for center label
  const avgMastery = Math.round(
    standards.reduce((sum, s) => sum + s.masteryLevel, 0) / total
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Mastery Overview</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Distribution of your standards across mastery tiers
      </p>

      <div className="mt-5 flex items-center gap-6">
        {/* Donut chart */}
        <div className="relative shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {/* Tier segments */}
            {segments.map((seg) => (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
                className="transition-all duration-700"
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-neutral-900">{avgMastery}%</span>
            <span className="text-[10px] text-neutral-500">avg mastery</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5">
          {tierCounts.map((tier) => (
            <div key={tier.label} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: tier.color }}
              />
              <span className="text-sm text-neutral-700">
                {tier.label}
              </span>
              <span className="text-sm font-semibold text-neutral-900">{tier.count}</span>
              <span className="text-xs text-neutral-400">
                ({total > 0 ? Math.round((tier.count / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
