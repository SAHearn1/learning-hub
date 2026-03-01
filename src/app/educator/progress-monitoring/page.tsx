import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { GoalWorkspaceCard } from '@/components/progress-monitoring/GoalWorkspaceCard';
import type { GoalCardData } from '@/components/progress-monitoring/GoalWorkspaceCard';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorProgressMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!STAFF_ROLES.includes(user.role)) redirect('/dashboard');

  const params = await searchParams;
  const studentId = params.studentId;

  if (!studentId) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-bold text-neutral-900">Progress Monitoring</h1>
        <p className="text-neutral-600">
          Select a student from the roster to view and manage their IEP goal progress monitoring.
        </p>
      </main>
    );
  }

  const goals = await db.iepGoal.findMany({
    where: { tenantId: user.tenantId, studentId },
    include: {
      entries: { orderBy: { observationDate: 'desc' }, take: 5 },
      reports: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const goalCards: GoalCardData[] = goals.map((g) => ({
    id: g.id,
    goalCode: g.goalCode,
    description: g.description,
    status: g.status,
    baselineValue: g.baselineValue,
    targetValue: g.targetValue,
    measurementUnit: g.measurementUnit,
    measurementMethod: g.measurementMethod,
    reportingFrequency: g.reportingFrequency,
    monitoringIntervalDays: g.monitoringIntervalDays,
    activatedAt: g.activatedAt?.toISOString() ?? null,
    entries: g.entries.map((e) => ({
      id: e.id,
      recordedValue: e.recordedValue,
      observationDate: e.observationDate.toISOString(),
    })),
    reports: g.reports.map((r) => ({
      id: r.id,
      deliveryStatus: r.deliveryStatus,
      createdAt: r.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Progress Monitoring</h1>
        {student && (
          <p className="mt-1 text-neutral-600">
            {student.user.firstName} {student.user.lastName}
          </p>
        )}
      </div>

      {goalCards.length === 0 ? (
        <p className="text-neutral-500">No IEP goals found for this student.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goalCards.map((g) => (
            <GoalWorkspaceCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </main>
  );
}
