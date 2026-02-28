import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

function formatDuration(start: Date, end: Date | null): string {
  if (!end) return 'In progress';
  const ms = end.getTime() - start.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'Less than a minute';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatSubject(subject: string): string {
  return subject
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatPhase(phase: string): string {
  return phase.charAt(0) + phase.slice(1).toLowerCase();
}

export default async function ParentActivityPage() {
  const user = await requirePageUser(['PARENT']);

  const childUserIds = user.parent?.childrenIds ?? [];

  const children =
    childUserIds.length > 0
      ? await db.student.findMany({
          where: { userId: { in: childUserIds } },
          include: {
            user: { select: { firstName: true, lastName: true } },
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 5,
              select: {
                id: true,
                subject: true,
                startedAt: true,
                endedAt: true,
                currentPhase: true,
              },
            },
            progress: {
              orderBy: { updatedAt: 'desc' },
              take: 3,
              include: {
                standard: {
                  select: { code: true, subject: true, description: true },
                },
              },
            },
          },
        })
      : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Child Activity</h1>
        <p className="mt-2 text-neutral-600">
          Recent learning sessions and progress updates for your children.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-600">No children linked to your account yet.</p>
          <p className="mt-2 text-sm text-neutral-500">
            Go to{' '}
            <Link href="/parent/settings" className="text-blue-600 hover:underline">
              Settings
            </Link>{' '}
            to link a student account.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {children.map((child) => {
            const childName =
              [child.user.firstName, child.user.lastName].filter(Boolean).join(' ') ||
              'Student';

            return (
              <div
                key={child.id}
                className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Child header */}
                <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">{childName}</h2>
                  <Link
                    href="/parent/grades"
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    View all grades
                  </Link>
                </div>

                <div className="px-6 py-5 space-y-6">
                  {/* Recent sessions */}
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                      Recent Sessions
                    </h3>
                    {child.sessions.length === 0 ? (
                      <p className="text-sm text-neutral-500">No sessions yet.</p>
                    ) : (
                      <ul className="divide-y divide-neutral-100">
                        {child.sessions.map((session) => (
                          <li key={session.id} className="py-3 flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-neutral-900 text-sm">
                                {formatSubject(session.subject)}
                              </p>
                              <p className="text-xs text-neutral-500 mt-0.5">
                                Phase: {formatPhase(session.currentPhase)} &middot;{' '}
                                {new Date(session.startedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <span className="text-xs text-neutral-400 whitespace-nowrap">
                              {formatDuration(new Date(session.startedAt), session.endedAt ? new Date(session.endedAt) : null)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Recent progress */}
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                      Recent Progress
                    </h3>
                    {child.progress.length === 0 ? (
                      <p className="text-sm text-neutral-500">No progress records yet.</p>
                    ) : (
                      <ul className="divide-y divide-neutral-100">
                        {child.progress.map((p) => {
                          const mastery = Math.round(p.masteryLevel * 100);
                          return (
                            <li key={p.id} className="py-3 flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-900 text-sm truncate">
                                  {p.standard.code}: {p.standard.description}
                                </p>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                  {formatSubject(p.standard.subject)} &middot; {p.assessmentCount} assessment{p.assessmentCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{ width: `${mastery}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-neutral-700 w-9 text-right">
                                  {mastery}%
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
