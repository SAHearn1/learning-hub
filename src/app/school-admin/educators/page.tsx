import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function SchoolAdminEducatorsPage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenantId = user.tenantId;

  const educators = await db.user.findMany({
    where: { tenantId, role: 'EDUCATOR' },
    orderBy: { lastName: 'asc' },
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      educator: {
        select: {
          certifications: true,
          specializations: true,
        },
      },
      teachingClasses: {
        where: { tenantId },
        select: { id: true },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Educators</h1>
          <p className="mt-2 text-neutral-600">
            All educators in your school — {educators.length} total.
          </p>
        </div>
        <Link
          href="/school-admin/dashboard"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        {educators.length === 0 ? (
          <div className="px-6 py-12 text-center text-neutral-500">
            <p className="text-lg font-medium">No educators found</p>
            <p className="mt-1 text-sm">Invite educators to join your school to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Classes</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Specializations</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {educators.map((educator) => (
                  <tr key={educator.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {educator.firstName} {educator.lastName}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{educator.email}</td>
                    <td className="px-6 py-4 text-neutral-700">
                      {educator.teachingClasses.length}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {educator.educator?.specializations && educator.educator.specializations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {educator.educator.specializations.slice(0, 3).map((spec) => (
                            <span
                              key={spec}
                              className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                            >
                              {spec}
                            </span>
                          ))}
                          {educator.educator.specializations.length > 3 && (
                            <span className="text-xs text-neutral-400">
                              +{educator.educator.specializations.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {educator.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
