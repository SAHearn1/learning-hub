'use client';

export type ComplianceMetrics = {
  totalCases: number;
  openCases: number;
  overdueCount: number;
};

export function ComplianceHeatmap({ metrics }: { metrics: ComplianceMetrics }) {
  const complianceRate =
    metrics.openCases > 0
      ? ((metrics.openCases - metrics.overdueCount) / metrics.openCases) * 100
      : 100;

  const rateColor =
    complianceRate >= 90
      ? 'text-green-600'
      : complianceRate >= 70
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Total Cases</div>
        <div className="mt-1 text-2xl font-bold text-neutral-900">{metrics.totalCases}</div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Open Cases</div>
        <div className="mt-1 text-2xl font-bold text-neutral-900">{metrics.openCases}</div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Overdue</div>
        <div className={`mt-1 text-2xl font-bold ${metrics.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {metrics.overdueCount}
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-neutral-500">Compliance Rate</div>
        <div className={`mt-1 text-2xl font-bold ${rateColor}`}>
          {complianceRate.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
