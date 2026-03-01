'use client';

import { useState } from 'react';

export type GoalCardData = {
  id: string;
  goalCode: string;
  description: string;
  status: string;
  baselineValue: number;
  targetValue: number;
  measurementUnit: string | null;
  measurementMethod: string | null;
  reportingFrequency: string | null;
  monitoringIntervalDays: number;
  activatedAt: string | null;
  entries: { id: string; recordedValue: number; observationDate: string }[];
  reports: { id: string; deliveryStatus: string; createdAt: string }[];
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  DISCONTINUED: 'bg-red-100 text-red-800',
};

export function GoalWorkspaceCard({
  goal,
  onStatusChange,
}: {
  goal: GoalCardData;
  onStatusChange?: (goalId: string, status: string) => void;
}) {
  const [updating, setUpdating] = useState(false);

  const currentValue =
    goal.entries.length > 0 ? goal.entries[0].recordedValue : goal.baselineValue;
  const progress =
    goal.targetValue !== goal.baselineValue
      ? ((currentValue - goal.baselineValue) / (goal.targetValue - goal.baselineValue)) * 100
      : 0;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  async function handleActivate() {
    if (!onStatusChange) return;
    setUpdating(true);
    try {
      await onStatusChange(goal.id, 'ACTIVE');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-mono text-sm text-neutral-500">{goal.goalCode}</span>
          <span
            className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[goal.status] ?? 'bg-gray-100 text-gray-800'}`}
          >
            {goal.status}
          </span>
        </div>
        {goal.status === 'DRAFT' && onStatusChange && (
          <button
            onClick={handleActivate}
            disabled={updating}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {updating ? 'Activating...' : 'Activate'}
          </button>
        )}
      </div>

      <p className="text-sm text-neutral-700 mb-3">{goal.description}</p>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="rounded bg-neutral-50 p-2">
          <div className="text-xs text-neutral-500">Baseline</div>
          <div className="text-sm font-semibold">{goal.baselineValue} {goal.measurementUnit ?? ''}</div>
        </div>
        <div className="rounded bg-neutral-50 p-2">
          <div className="text-xs text-neutral-500">Current</div>
          <div className="text-sm font-semibold">{currentValue} {goal.measurementUnit ?? ''}</div>
        </div>
        <div className="rounded bg-neutral-50 p-2">
          <div className="text-xs text-neutral-500">Target</div>
          <div className="text-sm font-semibold">{goal.targetValue} {goal.measurementUnit ?? ''}</div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
          <span>Progress</span>
          <span>{clampedProgress.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-neutral-500">
        <span>{goal.entries.length} data points</span>
        <span>{goal.reports.length} report(s)</span>
      </div>
    </div>
  );
}
