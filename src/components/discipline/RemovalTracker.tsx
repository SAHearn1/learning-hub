'use client';

export type RemovalData = {
  removalDays: number;
  cumulativeRemovalDays: number;
  isChangeOfPlacement: boolean;
};

export function RemovalTracker({ data }: { data: RemovalData }) {
  const threshold = 10;
  const percent = Math.min(
    (data.cumulativeRemovalDays / threshold) * 100,
    100,
  );
  const overThreshold = data.cumulativeRemovalDays > threshold;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">
        Removal Day Tracker
      </h3>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-neutral-900">
          {data.cumulativeRemovalDays}
        </span>
        <span className="text-xs text-neutral-500">
          / {threshold} day threshold
        </span>
      </div>
      <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            overThreshold ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {data.isChangeOfPlacement && (
        <p className="mt-2 text-xs font-medium text-red-600">
          Change of placement — additional protections required
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-500">
        Current removal: {data.removalDays} day{data.removalDays !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
