import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function SchoolAdminProgressMonitoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!ADMIN_ROLES.includes(user.role)) redirect('/dashboard');

  const [totalGoals, activeGoals, goalsWithoutMethod, goalsWithoutFrequency] =
    await Promise.all([
      db.iepGoal.count({ where: { tenantId: user.tenantId } }),
      db.iepGoal.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      db.iepGoal.count({
        where: { tenantId: user.tenantId, status: 'ACTIVE', measurementMethod: null },
      }),
      db.iepGoal.count({
        where: { tenantId: user.tenantId, status: 'ACTIVE', reportingFrequency: null },
      }),
    ]);

  const criticalViolations = goalsWithoutMethod + goalsWithoutFrequency;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">
        Progress Monitoring — Compliance Dashboard
      </h1>
      <p className="text-neutral-600">
        District-wide compliance overview for IEP goal progress monitoring under 34 CFR
        &sect;300.320(a)(3).
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Total Goals</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900">{totalGoals}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Active Goals</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900">{activeGoals}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Missing Measurement Method</div>
          <div className={`mt-1 text-2xl font-bold ${goalsWithoutMethod > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {goalsWithoutMethod}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Missing Reporting Frequency</div>
          <div className={`mt-1 text-2xl font-bold ${goalsWithoutFrequency > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {goalsWithoutFrequency}
          </div>
        </div>
      </div>

      {criticalViolations > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4" role="alert">
          <h2 className="font-semibold text-red-800">
            {criticalViolations} CRITICAL Compliance Violation{criticalViolations > 1 ? 's' : ''}
          </h2>
          <p className="mt-1 text-sm text-red-700">
            Active IEP goals are missing required measurement methods or reporting frequencies
            per 34 CFR &sect;300.320(a)(3). These must be resolved immediately.
          </p>
        </div>
      )}

      {criticalViolations === 0 && activeGoals > 0 && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h2 className="font-semibold text-green-800">All Active Goals Compliant</h2>
          <p className="mt-1 text-sm text-green-700">
            All active IEP goals have required measurement methods and reporting frequencies defined.
          </p>
        </div>
      )}
    </main>
  );
}
