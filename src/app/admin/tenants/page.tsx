import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';
import { SuspendButton } from './suspend-button';

export default async function AdminTenantsPage() {
  await requirePageUser(['PLATFORM_ADMIN']);

  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

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
          <span>Tenants</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Tenants</h1>
        <p className="mt-1 text-neutral-600">
          All organizations registered on the platform.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100">
          <span className="text-sm text-neutral-500">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Name</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Plan</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Students</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Total Users</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Created</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-neutral-400">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{tenant.name}</div>
                      <div className="text-xs text-neutral-400">{tenant.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{tenant.subscriptionTier}</td>
                    <td className="px-6 py-4">
                      {tenant.isSuspended ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tenant.subscriptionStatus === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : tenant.subscriptionStatus === 'TRIALING'
                              ? 'bg-blue-100 text-blue-800'
                              : tenant.subscriptionStatus === 'PAST_DUE'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {tenant.subscriptionStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {studentCountMap.get(tenant.id) ?? 0}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{tenant._count.users}</td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {!tenant.isSuspended ? (
                        <SuspendButton tenantId={tenant.id} tenantName={tenant.name} />
                      ) : (
                        <span className="rounded px-2.5 py-1 text-xs font-medium text-neutral-400 border border-neutral-200">
                          Suspended
                        </span>
                      )}
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
