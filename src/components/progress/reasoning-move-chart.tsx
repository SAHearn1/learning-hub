'use client';

const MOVE_LABELS: Record<string, string> = {
  DECOMPOSE: 'Decompose',
  IDENTIFY: 'Identify',
  COMPARE: 'Compare',
  CLASSIFY: 'Classify',
  SEQUENCE: 'Sequence',
  CAUSE_EFFECT: 'Cause & Effect',
  QUESTION: 'Question',
  CHALLENGE: 'Challenge',
  VERIFY: 'Verify',
  JUSTIFY: 'Justify',
  CRITIQUE: 'Critique',
  WEIGH: 'Weigh',
  HYPOTHESIZE: 'Hypothesize',
  CONNECT: 'Connect',
  GENERALIZE: 'Generalize',
  SPECIALIZE: 'Specialize',
  TRANSFORM: 'Transform',
  CREATE: 'Create',
  MONITOR: 'Monitor',
  ADJUST: 'Adjust',
  REFLECT: 'Reflect',
  PLAN: 'Plan',
};

const PROFICIENCY_COLORS = [
  'bg-neutral-200',  // level 0 (unused)
  'bg-amber-400',    // level 1
  'bg-yellow-400',   // level 2
  'bg-lime-500',     // level 3
  'bg-emerald-500',  // level 4
  'bg-green-600',    // level 5
];

const PROFICIENCY_LABELS = ['', 'Introduced', 'Developing', 'Practicing', 'Proficient', 'Expert'];

interface ReasoningMove {
  move: string;
  usageCount: number;
  promptedUsage: number;
  spontaneousUsage: number;
  proficiencyLevel: number;
}

export function ReasoningMoveChart({ moves }: { moves: ReasoningMove[] }) {
  if (moves.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Reasoning Moves</h2>
        <p className="mt-3 text-sm text-neutral-500">Reasoning move data will appear as you complete tutoring sessions.</p>
      </div>
    );
  }

  const maxUsage = Math.max(...moves.map(m => m.usageCount), 1);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Reasoning Moves</h2>
      <p className="mt-1 text-xs text-neutral-500">How you think — tracked across 21 reasoning strategies</p>

      <div className="mt-4 space-y-2.5">
        {moves.map((m) => {
          const level = Math.min(m.proficiencyLevel, 5);
          return (
            <div key={m.move} className="group">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">
                  {MOVE_LABELS[m.move] || m.move}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${PROFICIENCY_COLORS[level]}`}>
                    {PROFICIENCY_LABELS[level]}
                  </span>
                  <span className="text-xs text-neutral-400">{m.usageCount} uses</span>
                </span>
              </div>
              <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-neutral-100">
                {/* Prompted usage */}
                <div
                  className="h-full rounded-l-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${(m.promptedUsage / maxUsage) * 100}%` }}
                  title={`Prompted: ${m.promptedUsage}`}
                />
                {/* Spontaneous usage */}
                <div
                  className="h-full rounded-r-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(m.spontaneousUsage / maxUsage) * 100}%` }}
                  title={`Spontaneous: ${m.spontaneousUsage}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-full bg-amber-400" /> Prompted
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-full bg-emerald-500" /> Spontaneous
        </span>
      </div>
    </div>
  );
}
