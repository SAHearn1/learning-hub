'use client';

import { CaseStatusBadge } from './CaseStatusBadge';

export type ParentCaseData = {
  id: string;
  caseType: string;
  currentState: string;
  referralDate: string | null;
  evaluationDueDate: string | null;
  createdAt: string;
};

export function ParentCaseView({ cases }: { cases: ParentCaseData[] }) {
  if (cases.length === 0) {
    return (
      <p className="text-sm text-neutral-500">No evaluation cases on file.</p>
    );
  }

  return (
    <div className="space-y-3">
      {cases.map((c) => (
        <div key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900">
              {c.caseType === 'INITIAL' ? 'Initial Evaluation' : c.caseType === 'REEVALUATION' ? 'Reevaluation' : 'Dismissal'}
            </span>
            <CaseStatusBadge state={c.currentState} />
          </div>
          <div className="text-xs text-neutral-500 space-y-1">
            {c.referralDate && (
              <p>Referred: {new Date(c.referralDate).toLocaleDateString()}</p>
            )}
            {c.evaluationDueDate && (
              <p>
                Due: {new Date(c.evaluationDueDate).toLocaleDateString()}
                {new Date(c.evaluationDueDate) < new Date() && c.currentState !== 'CLOSED' && (
                  <span className="ml-1 text-red-600 font-medium">OVERDUE</span>
                )}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
