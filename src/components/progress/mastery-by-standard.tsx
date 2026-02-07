'use client';

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

interface MasteryBarProps {
  label: string;
  value: number;
  color?: string;
  assessmentCount?: number;
}

function MasteryBar({ label, value, color = '#3B82F6', assessmentCount }: MasteryBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const tier =
    clamped >= 80 ? 'Mastered' :
    clamped >= 60 ? 'Proficient' :
    clamped >= 40 ? 'Developing' :
    'Beginning';

  return (
    <div className="group">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-neutral-800 truncate max-w-[70%]">{label}</span>
        <span className="text-xs text-neutral-500 ml-2 shrink-0">
          {Math.round(clamped)}% &middot; {tier}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {assessmentCount !== undefined && (
        <p className="mt-0.5 text-[11px] text-neutral-400">{assessmentCount} assessment{assessmentCount !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

interface Standard {
  masteryLevel: number;
  assessmentCount: number;
  standard: {
    code: string;
    subject: string;
    description: string;
  };
}

export function MasteryByStandard({ standards }: { standards: Standard[] }) {
  if (standards.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Mastery by Standard</h2>
        <p className="mt-3 text-sm text-neutral-500">No standards tracked yet. Start a tutoring session to begin building mastery.</p>
      </div>
    );
  }

  const grouped: Record<string, Standard[]> = {};
  for (const s of standards) {
    const subj = s.standard.subject;
    if (!grouped[subj]) grouped[subj] = [];
    grouped[subj].push(s);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Mastery by Standard</h2>
      {Object.entries(grouped).map(([subject, entries]) => (
        <div key={subject} className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: SUBJECT_COLORS[subject] || '#6B7280' }}
            />
            <span className="text-sm font-semibold text-neutral-700">
              {SUBJECT_LABELS[subject] || subject}
            </span>
          </div>
          <div className="space-y-3">
            {entries
              .sort((a, b) => b.masteryLevel - a.masteryLevel)
              .map((entry) => (
                <MasteryBar
                  key={entry.standard.code}
                  label={`${entry.standard.code} — ${entry.standard.description}`}
                  value={entry.masteryLevel}
                  color={SUBJECT_COLORS[entry.standard.subject]}
                  assessmentCount={entry.assessmentCount}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
