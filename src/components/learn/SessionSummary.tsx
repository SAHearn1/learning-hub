'use client';

import { Button } from '@/components/ui/button';
import { BRAND } from '@/brand/brand';
import type { SessionSummary as SessionSummaryData } from '@/hooks/useChat';

interface SessionSummaryProps {
  summary: SessionSummaryData;
  onNewSession: () => void;
  onViewProgress: () => void;
}

export function SessionSummary({ summary, onNewSession, onViewProgress }: SessionSummaryProps) {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-6 py-12 text-center">
      <div>
        <svg className="mx-auto h-16 w-16 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-neutral-900">Session Complete</h2>
        <p className="mt-1 text-neutral-600">
          Great work in your {summary.subject} session!
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4 text-left">
          <div>
            <div className="text-xs font-medium text-neutral-500">Duration</div>
            <div className="mt-0.5 text-lg font-semibold text-neutral-800">{summary.duration}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">Messages</div>
            <div className="mt-0.5 text-lg font-semibold text-neutral-800">{summary.messageCount}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">Your Responses</div>
            <div className="mt-0.5 text-lg font-semibold text-neutral-800">{summary.userMessageCount}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">5R Phases</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {summary.phasesVisited.map((phase) => {
                const phaseKey = phase as keyof typeof BRAND.phases;
                const info = BRAND.phases[phaseKey];
                return (
                  <span
                    key={phase}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `var(${info?.cssVar ?? '--phase-root'}-bg)`,
                      color: `var(${info?.cssVar ?? '--phase-root'}-color)`,
                    }}
                  >
                    {info?.name ?? phase}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
        <p className="text-sm text-primary-800">
          Every session strengthens your thinking. Your brain builds new connections when
          you work through challenges, even the tough ones.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={onNewSession} className="px-8">
          Start New Session
        </Button>
        <Button variant="outline" onClick={onViewProgress} className="px-8">
          View Progress
        </Button>
      </div>
    </div>
  );
}
