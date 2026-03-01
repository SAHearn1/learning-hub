import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDisciplineMetrics } from '@/lib/discipline/discipline.service';
import { DisciplineComplianceCard } from '@/components/discipline/DisciplineComplianceCard';
import type { DisciplineMetrics } from '@/components/discipline/DisciplineComplianceCard';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function SchoolAdminDisciplinePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!ADMIN_ROLES.includes(user.role)) redirect('/dashboard');

  const raw = await getDisciplineMetrics(user.tenantId);
  const metrics: DisciplineMetrics = raw;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">
        Discipline Protections Dashboard
      </h1>
      <p className="text-neutral-600">
        District-wide discipline compliance overview under 34 CFR
        &sect;300.530&ndash;300.536.
      </p>

      <DisciplineComplianceCard metrics={metrics} />

      {metrics.pendingMdr > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4" role="alert">
          <h2 className="font-semibold text-red-800">
            {metrics.pendingMdr} Pending Manifestation Determination
            {metrics.pendingMdr > 1 ? 's' : ''}
          </h2>
          <p className="mt-1 text-sm text-red-700">
            MDR must be conducted within 10 school days of a change-of-placement decision
            per 34 CFR &sect;300.530(e). Immediate action required.
          </p>
        </div>
      )}

      {metrics.pendingMdr === 0 && metrics.openCases > 0 && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h2 className="font-semibold text-green-800">
            All MDRs Complete
          </h2>
          <p className="mt-1 text-sm text-green-700">
            All change-of-placement cases have completed manifestation determination reviews.
          </p>
        </div>
      )}
    </main>
  );
}
