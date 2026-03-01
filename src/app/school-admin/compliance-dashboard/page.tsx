import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { generateComplianceSnapshot } from '@/lib/compliance-dashboard';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

const RISK_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-300',
  MODERATE: 'bg-amber-100 text-amber-800 border-amber-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
};

export default async function ComplianceDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!ADMIN_ROLES.includes(user.role)) redirect('/dashboard');

  const snapshot = await generateComplianceSnapshot(user.tenantId);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            IDEA Compliance Dashboard
          </h1>
          <p className="mt-1 text-neutral-600">
            Unified compliance overview across all special education modules.
          </p>
        </div>
        <div
          className={`rounded-lg border px-4 py-2 text-center ${RISK_STYLES[snapshot.riskLevel]}`}
        >
          <div className="text-xs font-medium">Risk Level</div>
          <div className="text-lg font-bold">{snapshot.riskLevel}</div>
          <div className="text-xs">{snapshot.riskScore}/100</div>
        </div>
      </div>

      {/* Safeguards */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-800 mb-3">
          Procedural Safeguards
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="Total Notices" value={snapshot.safeguards.totalNotices} />
          <MetricCard label="Delivered" value={snapshot.safeguards.delivered} />
          <MetricCard
            label="Pending"
            value={snapshot.safeguards.pending}
            warn={snapshot.safeguards.pending > 0}
          />
          <MetricCard label="Acknowledged" value={snapshot.safeguards.acknowledged} />
        </div>
      </section>

      {/* Progress Monitoring */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-800 mb-3">
          Progress Monitoring
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="Total Goals" value={snapshot.progressMonitoring.totalGoals} />
          <MetricCard label="Active Goals" value={snapshot.progressMonitoring.activeGoals} />
          <MetricCard
            label="Missing Method"
            value={snapshot.progressMonitoring.missingMeasurementMethod}
            critical={snapshot.progressMonitoring.missingMeasurementMethod > 0}
          />
          <MetricCard
            label="Missing Frequency"
            value={snapshot.progressMonitoring.missingReportingFrequency}
            critical={snapshot.progressMonitoring.missingReportingFrequency > 0}
          />
        </div>
      </section>

      {/* Evaluations */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-800 mb-3">
          Evaluations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total Cases" value={snapshot.evaluations.totalCases} />
          <MetricCard label="Open Cases" value={snapshot.evaluations.openCases} />
          <MetricCard
            label="Overdue"
            value={snapshot.evaluations.overdueCases}
            critical={snapshot.evaluations.overdueCases > 0}
          />
          <MetricCard
            label="Awaiting Consent"
            value={snapshot.evaluations.awaitingConsent}
            warn={snapshot.evaluations.awaitingConsent > 0}
          />
          <MetricCard
            label="Missing Plan"
            value={snapshot.evaluations.missingPlan}
            critical={snapshot.evaluations.missingPlan > 0}
          />
        </div>
      </section>

      {/* Discipline */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-800 mb-3">
          Discipline Protections
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="Total Removals" value={snapshot.discipline.totalRemovals} />
          <MetricCard label="Open Cases" value={snapshot.discipline.openCases} />
          <MetricCard
            label="Change of Placement"
            value={snapshot.discipline.changeOfPlacement}
            warn={snapshot.discipline.changeOfPlacement > 0}
          />
          <MetricCard
            label="Pending MDR"
            value={snapshot.discipline.pendingMdr}
            critical={snapshot.discipline.pendingMdr > 0}
          />
        </div>
      </section>

      <p className="text-xs text-neutral-400">
        Snapshot generated: {new Date(snapshot.generatedAt).toLocaleString()}
      </p>
    </main>
  );
}

function MetricCard({
  label,
  value,
  warn = false,
  critical = false,
}: {
  label: string;
  value: number;
  warn?: boolean;
  critical?: boolean;
}) {
  const color = critical
    ? 'text-red-600'
    : warn
      ? 'text-amber-600'
      : 'text-neutral-900';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
