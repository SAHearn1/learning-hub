'use client';

import { useMemo, useState } from 'react';

interface GrowthDataPoint {
  date: string;
  score: number | null;
  isCorrect: boolean | null;
  bloomsLevel: string;
  subject: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  MATH: '#3B82F6',
  SCIENCE: '#10B981',
  LANGUAGE_ARTS: '#8B5CF6',
};

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Math',
  SCIENCE: 'Science',
  LANGUAGE_ARTS: 'ELA',
};

type TimeRange = '7d' | '30d' | '90d' | 'all';

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function filterByRange(data: GrowthDataPoint[], range: TimeRange): GrowthDataPoint[] {
  if (range === 'all') return data;
  const now = Date.now();
  const ms = { '7d': 7, '30d': 30, '90d': 90 }[range] * 86400000;
  return data.filter((d) => now - new Date(d.date).getTime() <= ms);
}

interface WeekBucket {
  weekKey: string;
  label: string;
  avgScore: number;
  count: number;
  correctRate: number;
}

function aggregateByWeek(data: GrowthDataPoint[]): WeekBucket[] {
  const buckets = new Map<string, { scores: number[]; correct: number; total: number }>();

  for (const d of data) {
    const key = getWeekKey(new Date(d.date));
    if (!buckets.has(key)) buckets.set(key, { scores: [], correct: 0, total: 0 });
    const b = buckets.get(key)!;
    if (d.score != null) b.scores.push(d.score);
    b.total++;
    if (d.isCorrect) b.correct++;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, b]) => ({
      weekKey,
      label: new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: b.scores.length > 0 ? b.scores.reduce((s, v) => s + v, 0) / b.scores.length : 0,
      count: b.total,
      correctRate: b.total > 0 ? b.correct / b.total : 0,
    }));
}

// Chart rendering constants
const CHART_W = 400;
const CHART_H = 180;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export function GrowthChart({ data }: { data: GrowthDataPoint[] }) {
  const [range, setRange] = useState<TimeRange>('30d');

  const filtered = useMemo(() => filterByRange(data, range), [data, range]);
  const buckets = useMemo(() => aggregateByWeek(filtered), [filtered]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Growth Over Time</h2>
        <p className="mt-3 text-sm text-neutral-500">
          Complete assessments to see your growth trends here.
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...buckets.map((b) => b.avgScore), 1);
  const yMax = Math.ceil(maxScore / 20) * 20 || 100;

  function x(i: number) {
    if (buckets.length <= 1) return PAD_L + PLOT_W / 2;
    return PAD_L + (i / (buckets.length - 1)) * PLOT_W;
  }
  function y(val: number) {
    return PAD_T + PLOT_H - (val / yMax) * PLOT_H;
  }

  // Build polyline points
  const linePoints = buckets.map((b, i) => `${x(i)},${y(b.avgScore)}`).join(' ');

  // Build area path (filled below the line)
  const areaPath =
    buckets.length > 0
      ? `M${x(0)},${y(0)} ` +
        buckets.map((b, i) => `L${x(i)},${y(b.avgScore)}`).join(' ') +
        ` L${x(buckets.length - 1)},${y(0)} Z`
      : '';

  // Y-axis gridlines
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  // Subject breakdown for this range
  const subjectCounts: Record<string, number> = {};
  for (const d of filtered) {
    subjectCounts[d.subject] = (subjectCounts[d.subject] || 0) + 1;
  }

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Growth Over Time</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Weekly average assessment scores
          </p>
        </div>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                range === r.key
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {buckets.length === 0 ? (
        <p className="mt-6 text-center text-sm text-neutral-400">
          No data in this time range.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="mt-4 w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Gridlines */}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD_L}
                  y1={y(tick)}
                  x2={CHART_W - PAD_R}
                  y2={y(tick)}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
                <text
                  x={PAD_L - 4}
                  y={y(tick) + 3}
                  textAnchor="end"
                  className="fill-neutral-400"
                  fontSize="9"
                >
                  {Math.round(tick)}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#growthGradient)" opacity="0.3" />

            {/* Line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data points */}
            {buckets.map((b, i) => (
              <g key={b.weekKey}>
                <circle cx={x(i)} cy={y(b.avgScore)} r="3.5" fill="#22c55e" />
                <circle cx={x(i)} cy={y(b.avgScore)} r="2" fill="white" />
              </g>
            ))}

            {/* X-axis labels (show a subset to avoid overlap) */}
            {buckets.map((b, i) => {
              const showEvery = Math.max(1, Math.ceil(buckets.length / 6));
              if (i % showEvery !== 0 && i !== buckets.length - 1) return null;
              return (
                <text
                  key={b.weekKey}
                  x={x(i)}
                  y={CHART_H - 4}
                  textAnchor="middle"
                  className="fill-neutral-400"
                  fontSize="8"
                >
                  {b.label}
                </text>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>

          {/* Subject breakdown */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            <span>{filtered.length} assessments</span>
            {Object.entries(subjectCounts).map(([subj, count]) => (
              <span key={subj} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SUBJECT_COLORS[subj] || '#6B7280' }}
                />
                {SUBJECT_LABELS[subj] || subj}: {count}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
