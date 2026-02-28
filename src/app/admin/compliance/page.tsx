import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function AdminCompliancePage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  // Total students with active IEPs across the district
  const totalIepStudents = await db.student.count({
    where: {
      iepAccommodations: { some: { active: true } },
    },
  });

  // Consent stats by tenant
  const tenants = await db.tenant.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const consentStatsByTenant = await Promise.all(
    tenants.map(async (tenant) => {
      const total = await db.user.count({
        where: { tenantId: tenant.id, isMinor: true },
      });
      const granted = await db.user.count({
        where: { tenantId: tenant.id, isMinor: true, consentStatus: 'GRANTED' },
      });
      const pending = await db.user.count({
        where: { tenantId: tenant.id, isMinor: true, consentStatus: 'PENDING' },
      });
      const denied = await db.user.count({
        where: {
          tenantId: tenant.id,
          isMinor: true,
          consentStatus: { in: ['DENIED', 'WITHDRAWN'] },
        },
      });
      return {
        tenant,
        total,
        granted,
        pending,
        denied,
        consentRate: total > 0 ? Math.round((granted / total) * 100) : null,
      };
    })
  );

  // Overall platform consent stats
  const totalMinors = await db.user.count({ where: { isMinor: true } });
  const totalGranted = await db.user.count({
    where: { isMinor: true, consentStatus: 'GRANTED' },
  });
  const overallConsentRate =
    totalMinors > 0 ? Math.round((totalGranted / totalMinors) * 100) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/admin/dashboard" className="hover:underline">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span>Compliance</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Compliance Dashboard</h1>
        <p className="mt-1 text-neutral-600">
          District-wide IEP coverage, parental consent rates, and data retention status.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Students with Active IEPs</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">{totalIepStudents}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Minor Students</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">{totalMinors}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Overall Consent Rate</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">
            {overallConsentRate !== null ? `${overallConsentRate}%` : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-neutral-400">{totalGranted} of {totalMinors} minors</p>
        </div>
      </div>

      {/* Consent rates per school */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Consent Rates by School</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">School</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Total Minors</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Granted</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Pending</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Denied/Withdrawn</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Consent Rate</th>
              </tr>
            </thead>
            <tbody>
              {consentStatsByTenant.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-400">
                    No schools found.
                  </td>
                </tr>
              ) : (
                consentStatsByTenant.map(({ tenant, total, granted, pending, denied, consentRate }) => (
                  <tr key={tenant.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">{tenant.name}</td>
                    <td className="px-6 py-4 text-neutral-700">{total}</td>
                    <td className="px-6 py-4 text-green-700">{granted}</td>
                    <td className="px-6 py-4 text-yellow-700">{pending}</td>
                    <td className="px-6 py-4 text-red-700">{denied}</td>
                    <td className="px-6 py-4">
                      {consentRate !== null ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            consentRate >= 90
                              ? 'bg-green-100 text-green-800'
                              : consentRate >= 70
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {consentRate}%
                        </span>
                      ) : (
                        <span className="text-neutral-400">No minors</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data retention section */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-900">Data Retention</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Manage automated data lifecycle policies and retention enforcement.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/data-retention"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            View Retention Dashboard
          </Link>
          <Link
            href="/data-retention"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            View Policy Document
          </Link>
        </div>
      </div>
    </main>
  );
}
