import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DisciplineStatusBadge } from '@/components/discipline/DisciplineStatusBadge';
import { RemovalTracker } from '@/components/discipline/RemovalTracker';
import { ManifestDeterminationPanel } from '@/components/discipline/ManifestDeterminationPanel';
import type { MdrData } from '@/components/discipline/ManifestDeterminationPanel';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function DisciplineCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!STAFF_ROLES.includes(user.role)) redirect('/dashboard');

  const { caseId } = await params;

  const dCase = await db.disciplineCase.findUnique({
    where: { id: caseId },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      manifestDetermination: true,
    },
  });

  if (!dCase || dCase.tenantId !== user.tenantId) notFound();

  const mdr: MdrData | null = dCase.manifestDetermination
    ? {
        id: dCase.manifestDetermination.id,
        meetingDate: dCase.manifestDetermination.meetingDate.toISOString(),
        outcome: dCase.manifestDetermination.outcome,
        rationale: dCase.manifestDetermination.rationale,
        conductRelated: dCase.manifestDetermination.conductRelated,
        disabilityRelated: dCase.manifestDetermination.disabilityRelated,
        iepImplemented: dCase.manifestDetermination.iepImplemented,
        attendees: dCase.manifestDetermination.attendees as { name: string; role: string }[],
      }
    : null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {dCase.student.user.firstName} {dCase.student.user.lastName}
          </h1>
          <p className="mt-1 text-neutral-600">
            {dCase.removalType.replace(/_/g, ' ')} &mdash;{' '}
            {new Date(dCase.removalStartDate).toLocaleDateString()}
          </p>
        </div>
        <DisciplineStatusBadge state={dCase.currentState} />
      </div>

      <RemovalTracker
        data={{
          removalDays: dCase.removalDays,
          cumulativeRemovalDays: dCase.cumulativeRemovalDays,
          isChangeOfPlacement: dCase.isChangeOfPlacement,
        }}
      />

      {/* Incident Description */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900 mb-2">
          Incident Description
        </h2>
        <p className="text-sm text-neutral-700">{dCase.incidentDescription}</p>
      </div>

      {/* Placement */}
      {dCase.currentPlacement && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">
            Current Placement
          </h2>
          <p className="text-sm text-neutral-700">
            {dCase.currentPlacement.replace(/_/g, ' ')}
          </p>
          {dCase.iaesEndDate && (
            <p className="text-xs text-neutral-500 mt-1">
              IAES ends: {new Date(dCase.iaesEndDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Services */}
      {dCase.servicesContinued && dCase.servicesDescription && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-green-900 mb-2">
            Services Continuation
          </h2>
          <p className="text-sm text-green-800">{dCase.servicesDescription}</p>
        </div>
      )}

      {/* MDR */}
      {dCase.isChangeOfPlacement && (
        <ManifestDeterminationPanel mdr={mdr} />
      )}
    </main>
  );
}
