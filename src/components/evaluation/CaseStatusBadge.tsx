'use client';

const STATE_STYLES: Record<string, string> = {
  EVAL_TRIGGERED: 'bg-purple-100 text-purple-800',
  SAFEGUARDS_ISSUED: 'bg-blue-100 text-blue-800',
  SAFEGUARDS_REQUIRED: 'bg-amber-100 text-amber-800',
  CONSENT_REQUESTED: 'bg-yellow-100 text-yellow-800',
  CONSENT_RECEIVED: 'bg-green-100 text-green-800',
  CONSENT_REFUSED: 'bg-red-100 text-red-800',
  EVALUATION_PLANNED: 'bg-cyan-100 text-cyan-800',
  ASSESSMENTS_IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  ASSESSMENTS_COMPLETE: 'bg-teal-100 text-teal-800',
  ELIGIBILITY_MEETING: 'bg-orange-100 text-orange-800',
  ELIGIBILITY_DECISION: 'bg-lime-100 text-lime-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const STATE_LABELS: Record<string, string> = {
  EVAL_TRIGGERED: 'Referral Received',
  SAFEGUARDS_ISSUED: 'Safeguards Issued',
  SAFEGUARDS_REQUIRED: 'Awaiting PWN',
  CONSENT_REQUESTED: 'Consent Requested',
  CONSENT_RECEIVED: 'Consent Received',
  CONSENT_REFUSED: 'Consent Refused',
  EVALUATION_PLANNED: 'Evaluation Planned',
  ASSESSMENTS_IN_PROGRESS: 'Assessments In Progress',
  ASSESSMENTS_COMPLETE: 'Assessments Complete',
  ELIGIBILITY_MEETING: 'Eligibility Meeting',
  ELIGIBILITY_DECISION: 'Decision Made',
  CLOSED: 'Closed',
};

export function CaseStatusBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_STYLES[state] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {STATE_LABELS[state] ?? state}
    </span>
  );
}
