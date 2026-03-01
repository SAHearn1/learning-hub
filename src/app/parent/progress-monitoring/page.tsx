import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ParentProgressCard } from '@/components/progress-monitoring/ParentProgressCard';
import type { GoalCardData } from '@/components/progress-monitoring/GoalWorkspaceCard';

export const dynamic = 'force-dynamic';

export default async function ParentProgressMonitoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'PARENT') redirect('/dashboard');

  const parent = await db.parent.findUnique({
    where: { userId: user.id },
  });

  if (!parent || parent.childrenIds.length === 0) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-bold text-neutral-900">Progress Monitoring</h1>
        <p className="text-neutral-600">No children linked to your account.</p>
      </main>
    );
  }

  // Fetch goals for all linked children
  const students = await db.student.findMany({
    where: { userId: { in: parent.childrenIds } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const allGoals = await db.iepGoal.findMany({
    where: {
      tenantId: user.tenantId,
      studentId: { in: students.map((s) => s.id) },
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
    include: {
      entries: { orderBy: { observationDate: 'desc' }, take: 5 },
      reports: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Progress Monitoring</h1>
      <p className="text-neutral-600">
        View your child&apos;s IEP goal progress and acknowledge reports.
      </p>

      {students.map((student) => {
        const studentGoals = allGoals.filter((g) => g.studentId === student.id);
        if (studentGoals.length === 0) return null;

        return (
          <div key={student.id}>
            <h2 className="text-lg font-semibold text-neutral-800 mb-3">
              {student.user.firstName} {student.user.lastName}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {studentGoals.map((g) => {
                const goalCard: GoalCardData = {
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
                };

                const reports = g.reports.map((r) => ({
                  id: r.id,
                  goalId: r.goalId,
                  deliveryStatus: r.deliveryStatus,
                  reportingPeriodStart: r.reportingPeriodStart.toISOString(),
                  reportingPeriodEnd: r.reportingPeriodEnd.toISOString(),
                  currentValue: r.currentValue,
                  trendDirection: r.trendDirection,
                  createdAt: r.createdAt.toISOString(),
                }));

                return (
                  <ParentProgressCard
                    key={g.id}
                    goal={goalCard}
                    reports={reports}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </main>
  );
}
