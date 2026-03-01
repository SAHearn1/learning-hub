'use client';

export type TimelineEntry = {
  id: string;
  fromState: string;
  toState: string;
  transitionBy: string;
  reason: string | null;
  createdAt: string;
};

const STATE_LABELS: Record<string, string> = {
  EVAL_TRIGGERED: 'Referral',
  SAFEGUARDS_ISSUED: 'Safeguards Issued',
  SAFEGUARDS_REQUIRED: 'PWN Required',
  CONSENT_REQUESTED: 'Consent Requested',
  CONSENT_RECEIVED: 'Consent Received',
  CONSENT_REFUSED: 'Consent Refused',
  EVALUATION_PLANNED: 'Plan Created',
  ASSESSMENTS_IN_PROGRESS: 'Assessments Started',
  ASSESSMENTS_COMPLETE: 'Assessments Done',
  ELIGIBILITY_MEETING: 'Meeting',
  ELIGIBILITY_DECISION: 'Decision',
  CLOSED: 'Closed',
};

export function CaseTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">No transitions recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            {i < entries.length - 1 && <div className="h-full w-0.5 bg-neutral-200" />}
          </div>
          <div className="pb-3">
            <div className="text-sm font-medium text-neutral-900">
              {STATE_LABELS[e.toState] ?? e.toState}
            </div>
            <div className="text-xs text-neutral-500">
              {new Date(e.createdAt).toLocaleString()}
              {e.reason && <span> &mdash; {e.reason}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
