import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function SchoolAdminClassesPage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenantId = user.tenantId;

  const classes = await db.class.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      educator: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: {
        select: {
          enrollments: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Classes</h1>
          <p className="mt-2 text-neutral-600">
            All classes across your school — {classes.length} total.
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
        {classes.length === 0 ? (
          <div className="px-6 py-12 text-center text-neutral-500">
            <p className="text-lg font-medium">No classes found</p>
            <p className="mt-1 text-sm">Classes created by educators will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Class Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Subject</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Educator</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Grade Level</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Students</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Academic Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">{cls.name}</td>
                    <td className="px-6 py-4 text-neutral-700">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {cls.subject.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-700">
                      {cls.educator.firstName} {cls.educator.lastName}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">Grade {cls.gradeLevel}</td>
                    <td className="px-6 py-4 text-neutral-700">
                      {cls._count.enrollments}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{cls.academicYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400">
        Showing up to 50 most recent classes. Educators manage class creation through the educator portal.
      </p>
    </main>
  );
}
