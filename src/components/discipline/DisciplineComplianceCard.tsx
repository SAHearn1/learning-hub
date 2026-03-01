'use client';

export type DisciplineMetrics = {
  totalCases: number;
  openCases: number;
  changeOfPlacementCases: number;
  pendingMdr: number;
};

export function DisciplineComplianceCard({
  metrics,
}: {
  metrics: DisciplineMetrics;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Total Removals</div>
        <div className="mt-1 text-2xl font-bold text-neutral-900">
          {metrics.totalCases}
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Open Cases</div>
        <div className="mt-1 text-2xl font-bold text-neutral-900">
          {metrics.openCases}
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Change of Placement</div>
        <div
          className={`mt-1 text-2xl font-bold ${
            metrics.changeOfPlacementCases > 0 ? 'text-amber-600' : 'text-green-600'
          }`}
        >
          {metrics.changeOfPlacementCases}
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Pending MDR</div>
        <div
          className={`mt-1 text-2xl font-bold ${
            metrics.pendingMdr > 0 ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {metrics.pendingMdr}
        </div>
      </div>
    </div>
  );
}
