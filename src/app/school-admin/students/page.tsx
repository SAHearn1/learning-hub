import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

const PAGE_SIZE = 25;

export default async function SchoolAdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenantId = user.tenantId;
  const params = await searchParams;
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10));

  const where = { tenantId, role: 'STUDENT' as const };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { lastName: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        consentStatus: true,
        createdAt: true,
        student: {
          select: {
            gradeLevel: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { classId: true },
            },
            iepAccommodations: {
              where: { active: true },
              select: { id: true },
            },
            progress: {
              select: { masteryLevel: true },
            },
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function consentBadge(status: string | null) {
    if (status === 'GRANTED') {
      return (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Granted
        </span>
      );
    }
    if (status === 'DENIED' || status === 'WITHDRAWN') {
      return (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        Pending
      </span>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Students</h1>
          <p className="mt-2 text-neutral-600">
            School-wide student roster — {total} total.
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
        {students.length === 0 ? (
          <div className="px-6 py-12 text-center text-neutral-500">
            <p className="text-lg font-medium">No students found</p>
            <p className="mt-1 text-sm">Students enrolled in your school will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Grade</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Classes</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">IEP</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Consent</th>
                  <th className="px-6 py-3 text-left font-semibold text-neutral-700">Avg Mastery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {students.map((student) => {
                  const progressEntries = student.student?.progress ?? [];
                  const avgMastery =
                    progressEntries.length > 0
                      ? Math.round(
                          (progressEntries.reduce((sum, p) => sum + p.masteryLevel, 0) /
                            progressEntries.length) *
                            10,
                        ) / 10
                      : null;

                  return (
                    <tr key={student.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-xs text-neutral-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 text-neutral-700">
                        {student.student?.gradeLevel != null
                          ? `Grade ${student.student.gradeLevel}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-neutral-700">
                        {student.student?.enrollments.length ?? 0}
                      </td>
                      <td className="px-6 py-4 text-neutral-700">
                        {(student.student?.iepAccommodations.length ?? 0) > 0 ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {student.student!.iepAccommodations.length} active
                          </span>
                        ) : (
                          <span className="text-neutral-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{consentBadge(student.consentStatus)}</td>
                      <td className="px-6 py-4 text-neutral-700">
                        {avgMastery != null ? `${avgMastery}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>
            Page {page} of {totalPages} ({total} students)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/school-admin/students?page=${page - 1}`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/school-admin/students?page=${page + 1}`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
