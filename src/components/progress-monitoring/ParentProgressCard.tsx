'use client';

import { useState } from 'react';
import type { GoalCardData } from './GoalWorkspaceCard';

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  GENERATED: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-blue-100 text-blue-800',
  ACKNOWLEDGED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

type Report = {
  id: string;
  goalId: string;
  deliveryStatus: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  currentValue: number;
  trendDirection: string;
  createdAt: string;
};

export function ParentProgressCard({
  goal,
  reports,
}: {
  goal: GoalCardData;
  reports: Report[];
}) {
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const currentValue =
    goal.entries.length > 0 ? goal.entries[0].recordedValue : goal.baselineValue;

  async function handleAcknowledge(reportId: string) {
    setAcknowledging(reportId);
    try {
      await fetch(
        `/api/progress-monitoring/goals/${goal.id}/reports/${reportId}/acknowledge`,
        { method: 'POST' },
      );
    } finally {
      setAcknowledging(null);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <span className="font-mono text-sm text-neutral-500">{goal.goalCode}</span>
        <h3 className="text-sm font-semibold text-neutral-900 mt-1">{goal.description}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div className="rounded bg-neutral-50 p-2">
          <div className="text-xs text-neutral-500">Baseline</div>
          <div className="text-sm font-semibold">{goal.baselineValue}</div>
        </div>
        <div className="rounded bg-neutral-50 p-2">
          <div className="text-xs text-neutral-500">Current</div>
          <div className="text-sm font-semibold">{currentValue}</div>
        </div>
        <div className="rounded bg-neutral-50 p-2">
          <div className="text-xs text-neutral-500">Target</div>
          <div className="text-sm font-semibold">{goal.targetValue}</div>
        </div>
      </div>

      {reports.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 mb-2">Progress Reports</h4>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-neutral-100 p-2 text-sm">
                <div>
                  <span className="text-neutral-600">
                    {new Date(r.reportingPeriodStart).toLocaleDateString()} — {new Date(r.reportingPeriodEnd).toLocaleDateString()}
                  </span>
                  <span
                    className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DELIVERY_STATUS_STYLES[r.deliveryStatus] ?? ''}`}
                  >
                    {r.deliveryStatus}
                  </span>
                </div>
                {r.deliveryStatus === 'DELIVERED' && (
                  <button
                    onClick={() => handleAcknowledge(r.id)}
                    disabled={acknowledging === r.id}
                    className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {acknowledging === r.id ? '...' : 'Acknowledge'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
