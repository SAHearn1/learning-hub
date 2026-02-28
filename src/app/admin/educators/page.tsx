import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function AdminEducatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const params = await searchParams;
  const tenantFilter = params.tenantId;

  const tenants = await db.tenant.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const educators = await db.user.findMany({
    where: {
      role: 'EDUCATOR',
      ...(tenantFilter ? { tenantId: tenantFilter } : {}),
    },
    include: {
      tenant: { select: { name: true } },
      teachingClasses: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/admin/dashboard" className="hover:underline">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span>Educators</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Educators</h1>
        <p className="mt-1 text-neutral-600">
          All educators across the district.
        </p>
      </div>

      {/* Filter by school/tenant */}
      <form method="GET" className="flex items-center gap-3">
        <label htmlFor="tenantId" className="text-sm font-medium text-neutral-700">
          Filter by school:
        </label>
        <select
          id="tenantId"
          name="tenantId"
          defaultValue={tenantFilter ?? ''}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Schools</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Apply
        </button>
        {tenantFilter && (
          <Link
            href="/admin/educators"
            className="text-sm text-blue-600 hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100">
          <span className="text-sm text-neutral-500">
            {educators.length} educator{educators.length !== 1 ? 's' : ''}
            {tenantFilter ? ` in ${tenants.find((t) => t.id === tenantFilter)?.name ?? 'selected school'}` : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Name</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Email</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">School</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Classes</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {educators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                    No educators found.
                  </td>
                </tr>
              ) : (
                educators.map((educator) => (
                  <tr key={educator.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {educator.firstName} {educator.lastName}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{educator.email}</td>
                    <td className="px-6 py-4 text-neutral-700">{educator.tenant.name}</td>
                    <td className="px-6 py-4 text-neutral-700">{educator.teachingClasses.length}</td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(educator.createdAt).toLocaleDateString()}
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
