import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';
import { DisciplineStatusBadge } from '@/components/discipline/DisciplineStatusBadge';
import { RemovalTracker } from '@/components/discipline/RemovalTracker';

export const dynamic = 'force-dynamic';

export default async function ParentDisciplinePage() {
  const user = await requirePageUser(['PARENT']);

  const parent = await db.parent.findFirst({
    where: { userId: user.id },
  });
  const childrenIds = (parent?.childrenIds ?? []) as string[];

  const cases = childrenIds.length > 0
    ? await db.disciplineCase.findMany({
        where: { studentId: { in: childrenIds } },
        include: { manifestDetermination: true, student: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">Discipline Cases</h1>
        <p className="mt-1 text-neutral-600">
          View your child&apos;s discipline records, removal details, and determination outcomes.
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-500">
          No discipline cases on record.
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    {c.student?.user?.firstName} {c.student?.user?.lastName} &mdash;{' '}
                    {new Date(c.removalStartDate).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">{c.incidentDescription}</p>
                </div>
                <DisciplineStatusBadge state={c.currentState} />
              </div>

              <RemovalTracker
                data={{
                  removalDays: c.removalDays,
                  cumulativeRemovalDays: c.cumulativeRemovalDays,
                  isChangeOfPlacement: c.isChangeOfPlacement,
                }}
              />

              {c.isChangeOfPlacement && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Change of placement detected &mdash; cumulative removals exceed 10 days.
                </div>
              )}

              {c.manifestDetermination && (
                <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <strong>MDR Outcome:</strong>{' '}
                  {c.manifestDetermination.outcome === 'IS_MANIFESTATION'
                    ? 'Conduct IS a manifestation of disability'
                    : 'Conduct is NOT a manifestation of disability'}
                  <p className="mt-1 text-xs">{c.manifestDetermination.rationale}</p>
                </div>
              )}

              {c.currentPlacement && (
                <p className="text-sm text-neutral-600">
                  Current Placement: {c.currentPlacement.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
