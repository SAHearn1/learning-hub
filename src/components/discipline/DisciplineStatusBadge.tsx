'use client';

const STATE_STYLES: Record<string, string> = {
  REMOVAL_RECORDED: 'bg-amber-100 text-amber-800',
  THRESHOLD_REVIEW: 'bg-red-100 text-red-800',
  MDR_PENDING: 'bg-purple-100 text-purple-800',
  MDR_COMPLETE: 'bg-blue-100 text-blue-800',
  PLACEMENT_DETERMINED: 'bg-cyan-100 text-cyan-800',
  SERVICES_IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const STATE_LABELS: Record<string, string> = {
  REMOVAL_RECORDED: 'Removal Recorded',
  THRESHOLD_REVIEW: 'Threshold Exceeded',
  MDR_PENDING: 'MDR Pending',
  MDR_COMPLETE: 'MDR Complete',
  PLACEMENT_DETERMINED: 'Placement Set',
  SERVICES_IN_PROGRESS: 'Services Active',
  CLOSED: 'Closed',
};

export function DisciplineStatusBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_STYLES[state] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {STATE_LABELS[state] ?? state}
    </span>
  );
}
