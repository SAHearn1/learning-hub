'use client';

const OUTCOME_STYLES: Record<string, string> = {
  ELIGIBLE: 'bg-green-100 text-green-800 border-green-300',
  NOT_ELIGIBLE: 'bg-red-100 text-red-800 border-red-300',
  DISMISSED: 'bg-gray-100 text-gray-800 border-gray-300',
};

export type EligibilityData = {
  outcome: string;
  disabilityCategory: string | null;
  rationale: string;
  decisionDate: string;
};

export function EligibilityPanel({ decision }: { decision: EligibilityData | null }) {
  if (!decision) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
        Eligibility determination has not been made.
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${OUTCOME_STYLES[decision.outcome] ?? 'bg-gray-50 border-gray-200'}`}>
      <h3 className="text-sm font-semibold mb-2">Eligibility Determination</h3>
      <p className="text-lg font-bold mb-1">
        {decision.outcome === 'ELIGIBLE' ? 'Eligible' : decision.outcome === 'NOT_ELIGIBLE' ? 'Not Eligible' : 'Dismissed'}
      </p>
      {decision.disabilityCategory && (
        <p className="text-sm mb-2">
          <strong>Category:</strong> {decision.disabilityCategory}
        </p>
      )}
      <p className="text-sm">{decision.rationale}</p>
      <p className="text-xs mt-2 opacity-75">
        Decision date: {new Date(decision.decisionDate).toLocaleDateString()}
      </p>
    </div>
  );
}
