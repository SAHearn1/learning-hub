'use client';

export type MdrData = {
  id: string;
  meetingDate: string;
  outcome: string;
  rationale: string;
  conductRelated: boolean;
  disabilityRelated: boolean;
  iepImplemented: boolean;
  attendees: { name: string; role: string }[];
};

export function ManifestDeterminationPanel({ mdr }: { mdr: MdrData | null }) {
  if (!mdr) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
        Manifestation Determination Review has not been conducted.
      </div>
    );
  }

  const isManifestation = mdr.outcome === 'IS_MANIFESTATION';

  return (
    <div
      className={`rounded-lg border p-4 ${
        isManifestation
          ? 'bg-amber-50 border-amber-300'
          : 'bg-green-50 border-green-300'
      }`}
    >
      <h3 className="text-sm font-semibold mb-2">Manifestation Determination Review</h3>
      <p className="text-lg font-bold mb-2">
        {isManifestation ? 'Is a Manifestation' : 'Not a Manifestation'}
      </p>
      <div className="text-sm space-y-1 mb-2">
        <p>
          <strong>Conduct related to disability:</strong>{' '}
          {mdr.conductRelated ? 'Yes' : 'No'}
        </p>
        <p>
          <strong>Directly related to disability:</strong>{' '}
          {mdr.disabilityRelated ? 'Yes' : 'No'}
        </p>
        <p>
          <strong>IEP implemented as written:</strong>{' '}
          {mdr.iepImplemented ? 'Yes' : 'No'}
        </p>
      </div>
      <p className="text-sm">{mdr.rationale}</p>
      <p className="text-xs mt-2 opacity-75">
        Meeting: {new Date(mdr.meetingDate).toLocaleDateString()}
        {' — '}
        {mdr.attendees.length} participants
      </p>
    </div>
  );
}
