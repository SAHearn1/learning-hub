import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DisciplineStatusBadge } from '@/components/discipline/DisciplineStatusBadge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorDisciplinePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!STAFF_ROLES.includes(user.role)) redirect('/dashboard');

  const params = await searchParams;
  const studentId = params.studentId;

  const whereClause: Record<string, unknown> = { tenantId: user.tenantId };
  if (studentId) whereClause.studentId = studentId;

  const cases = await db.disciplineCase.findMany({
    where: whereClause,
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      manifestDetermination: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Discipline Cases</h1>
      <p className="text-neutral-600">
        Track removals, manifestation determinations, and placement decisions under 34 CFR
        &sect;300.530.
      </p>

      {cases.length === 0 ? (
        <p className="text-neutral-500">No discipline cases found.</p>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/educator/discipline/${c.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-900">
                  {c.student.user.firstName} {c.student.user.lastName}
                </span>
                <DisciplineStatusBadge state={c.currentState} />
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span>{c.removalType.replace(/_/g, ' ')}</span>
                <span>{c.removalDays} day{c.removalDays !== 1 ? 's' : ''}</span>
                <span>
                  Cumulative: {c.cumulativeRemovalDays}
                  {c.isChangeOfPlacement && (
                    <span className="ml-1 text-red-600 font-medium">COP</span>
                  )}
                </span>
                <span>{new Date(c.removalStartDate).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
