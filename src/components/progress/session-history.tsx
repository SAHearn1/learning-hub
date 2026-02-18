'use client';

import Link from 'next/link';

interface Session {
  id: string;
  subject: string;
  currentPhase: string;
  startedAt: string;
  endedAt: string | null;
  _count: { messages: number; assessments: number };
}

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Math',
  SCIENCE: 'Science',
  LANGUAGE_ARTS: 'ELA',
  FINANCIAL_LITERACY: 'FinLit',
};

const SUBJECT_DOT_COLORS: Record<string, string> = {
  MATH: 'bg-blue-500',
  SCIENCE: 'bg-emerald-500',
  LANGUAGE_ARTS: 'bg-violet-500',
  FINANCIAL_LITERACY: 'bg-amber-500',
};

const PHASE_LABELS: Record<string, string> = {
  ROOT: 'Root',
  REGULATE: 'Regulate',
  REFLECT: 'Reflect',
  RESTORE: 'Restore',
  RECONNECT: 'Reconnect',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return 'In progress';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function SessionHistory({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Session History</h2>
        <p className="mt-3 text-sm text-neutral-500">No sessions yet. Start your first tutoring session to see history here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Session History</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Subject</th>
              <th className="pb-2 pr-4 font-medium">Phase</th>
              <th className="pb-2 pr-4 font-medium">Duration</th>
              <th className="pb-2 pr-4 font-medium">Messages</th>
              <th className="pb-2 font-medium">Assessments</th>
              <th className="pb-2 pl-4 font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-neutral-50 last:border-0">
                <td className="py-2.5 pr-4 text-neutral-700">{formatDate(s.startedAt)}</td>
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${SUBJECT_DOT_COLORS[s.subject] || 'bg-neutral-400'}`} />
                    {SUBJECT_LABELS[s.subject] || s.subject}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-neutral-600">{PHASE_LABELS[s.currentPhase] || s.currentPhase}</td>
                <td className="py-2.5 pr-4 text-neutral-600">{formatDuration(s.startedAt, s.endedAt)}</td>
                <td className="py-2.5 pr-4 text-neutral-600">{s._count.messages}</td>
                <td className="py-2.5 text-neutral-600">{s._count.assessments}</td>
                <td className="py-2.5 pl-4">
                  <Link
                    href={`/learn?resume=${encodeURIComponent(s.id)}`}
                    className="text-sm font-medium text-primary-700 hover:text-primary-900"
                  >
                    Resume
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
