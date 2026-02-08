'use client';

import { useState } from 'react';

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
};

const SUBJECT_COLORS: Record<string, string> = {
  MATH: '#3B82F6',
  SCIENCE: '#10B981',
  LANGUAGE_ARTS: '#8B5CF6',
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
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
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

function groupByDate(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    const dateKey = new Date(s.startedAt).toISOString().slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(s);
  }
  return groups;
}

export function SessionTimeline({ sessions }: { sessions: Session[] }) {
  const [expanded, setExpanded] = useState(false);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Session History</h2>
        <p className="mt-3 text-sm text-neutral-500">
          No sessions yet. Start your first tutoring session to see history here.
        </p>
      </div>
    );
  }

  const grouped = groupByDate(sessions);
  const dateEntries = Array.from(grouped.entries());
  const visibleEntries = expanded ? dateEntries : dateEntries.slice(0, 5);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Session History</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {sessions.length} recent session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {visibleEntries.map(([dateKey, daySessions]) => (
          <div key={dateKey}>
            {/* Date header */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {formatDate(daySessions[0].startedAt)}
              </span>
              <span className="h-px flex-1 bg-neutral-100" />
            </div>

            {/* Session cards for this date */}
            <div className="space-y-2">
              {daySessions.map((s) => {
                const color = SUBJECT_COLORS[s.subject] || '#6B7280';
                return (
                  <div
                    key={s.id}
                    className="flex items-stretch gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3 transition-colors hover:bg-white"
                  >
                    {/* Subject color bar */}
                    <div
                      className="w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-800">
                          {SUBJECT_LABELS[s.subject] || s.subject}
                        </span>
                        <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                          {PHASE_LABELS[s.currentPhase] || s.currentPhase}
                        </span>
                        {!s.endedAt && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            Live
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <span>{formatTime(s.startedAt)}</span>
                        <span>{formatDuration(s.startedAt, s.endedAt)}</span>
                        <span>{s._count.messages} msg{s._count.messages !== 1 ? 's' : ''}</span>
                        {s._count.assessments > 0 && (
                          <span>{s._count.assessments} assessment{s._count.assessments !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {dateEntries.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full rounded-lg border border-neutral-200 py-2 text-center text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          {expanded ? 'Show less' : `Show all ${dateEntries.length} days`}
        </button>
      )}
    </div>
  );
}
