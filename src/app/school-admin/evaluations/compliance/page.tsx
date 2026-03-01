import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ComplianceHeatmap } from '@/components/evaluation/ComplianceHeatmap';
import type { ComplianceMetrics } from '@/components/evaluation/ComplianceHeatmap';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EvaluationCompliancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!ADMIN_ROLES.includes(user.role)) redirect('/dashboard');

  const [totalCases, openCases, overdueCases, consentPending, missingPlan] =
    await Promise.all([
      db.evaluationCase.count({ where: { tenantId: user.tenantId } }),
      db.evaluationCase.count({
        where: { tenantId: user.tenantId, currentState: { not: 'CLOSED' } },
      }),
      db.evaluationCase.count({
        where: {
          tenantId: user.tenantId,
          currentState: { not: 'CLOSED' },
          evaluationDueDate: { lt: new Date() },
        },
      }),
      db.evaluationCase.count({
        where: { tenantId: user.tenantId, currentState: 'CONSENT_REQUESTED' },
      }),
      db.evaluationCase.count({
        where: {
          tenantId: user.tenantId,
          currentState: { in: ['CONSENT_RECEIVED', 'EVALUATION_PLANNED'] },
          plan: { is: null },
        },
      }),
    ]);

  const metrics: ComplianceMetrics = {
    totalCases,
    openCases,
    overdueCount: overdueCases,
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">
        Evaluation Compliance Dashboard
      </h1>
      <p className="text-neutral-600">
        District-wide compliance overview for special education evaluations under 34 CFR
        &sect;300.301&ndash;300.311.
      </p>

      <ComplianceHeatmap metrics={metrics} />

      {/* Additional compliance indicators */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Awaiting Consent</div>
          <div
            className={`mt-1 text-2xl font-bold ${consentPending > 0 ? 'text-amber-600' : 'text-green-600'}`}
          >
            {consentPending}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Cases in CONSENT_REQUESTED state
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Missing Evaluation Plan</div>
          <div
            className={`mt-1 text-2xl font-bold ${missingPlan > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {missingPlan}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Cases past consent without plan per 34 CFR &sect;300.304(b)
          </p>
        </div>
      </div>

      {overdueCases > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4" role="alert">
          <h2 className="font-semibold text-red-800">
            {overdueCases} Overdue Evaluation{overdueCases > 1 ? 's' : ''}
          </h2>
          <p className="mt-1 text-sm text-red-700">
            These evaluations have exceeded the timeline required under 34 CFR
            &sect;300.301(c)(1). Immediate action is required to restore compliance.
          </p>
        </div>
      )}

      {overdueCases === 0 && openCases > 0 && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h2 className="font-semibold text-green-800">All Evaluations On Track</h2>
          <p className="mt-1 text-sm text-green-700">
            All open evaluation cases are within their required timelines.
          </p>
        </div>
      )}
    </main>
  );
}
