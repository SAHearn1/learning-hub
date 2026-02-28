import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function AdminSchoolsPage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenants = await db.tenant.findMany({
    include: {
      _count: {
        select: {
          users: true,
        },
      },
      users: {
        where: { role: 'EDUCATOR' },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch class counts per tenant
  const classCounts = await db.class.groupBy({
    by: ['tenantId'],
    _count: { id: true },
  });
  const classCountMap = new Map(classCounts.map((c) => [c.tenantId, c._count.id]));

  // Fetch student counts per tenant
  const studentCounts = await db.user.groupBy({
    by: ['tenantId'],
    where: { role: 'STUDENT' },
    _count: { id: true },
  });
  const studentCountMap = new Map(studentCounts.map((c) => [c.tenantId, c._count.id]));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/admin/dashboard" className="hover:underline">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span>Schools</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Schools</h1>
        <p className="mt-1 text-neutral-600">
          All schools and tenants registered on the platform.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100">
          <span className="text-sm text-neutral-500">{tenants.length} school{tenants.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Name</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Plan</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Students</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Educators</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Classes</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-neutral-400">
                    No schools found.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">{tenant.name}</td>
                    <td className="px-6 py-4 text-neutral-700">{tenant.subscriptionTier}</td>
                    <td className="px-6 py-4">
                      {tenant.isSuspended ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {tenant.subscriptionStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {studentCountMap.get(tenant.id) ?? 0}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {tenant.users.length}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {classCountMap.get(tenant.id) ?? 0}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
