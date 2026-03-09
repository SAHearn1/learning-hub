import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/page-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EducatorDashboardPage() {
  const user = await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const [pendingReviews, openEvaluations, openDiscipline, activeIepGoals, recentSessions] =
    await Promise.all([
      db.aiSuggestionReview.count({
        where: { tenantId: user.tenantId, reviewStatus: 'PENDING_REVIEW' },
      }),
      db.evaluationCase.count({
        where: { tenantId: user.tenantId, currentState: { not: 'CLOSED' } },
      }),
      db.disciplineCase.count({
        where: { tenantId: user.tenantId, currentState: { not: 'CLOSED' } },
      }),
      db.iepGoal.count({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
      }),
      db.session.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          subject: true,
          startedAt: true,
          student: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

  const attentionItems = [
    { label: 'Pending AI Reviews', value: pendingReviews, href: '/educator/reviews', urgent: pendingReviews > 0 },
    { label: 'Open Evaluations', value: openEvaluations, href: '/educator/evaluations', urgent: openEvaluations > 0 },
    { label: 'Open Discipline Cases', value: openDiscipline, href: '/educator/discipline', urgent: openDiscipline > 0 },
    { label: 'Active IEP Goals', value: activeIepGoals, href: '/educator/compliance', urgent: false },
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Educator Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {attentionItems.map(({ label, value, href, urgent }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-xl p-4 border block hover:shadow-md transition-shadow ${
              urgent ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold ${urgent ? 'text-amber-700' : 'text-gray-900'}`}>
              {value}
            </p>
          </Link>
        ))}
      </div>

      {/* Needs Attention */}
      {(pendingReviews > 0 || openEvaluations > 0 || openDiscipline > 0) && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Needs Attention</h2>
          <div className="flex flex-wrap gap-3">
            {pendingReviews > 0 && (
              <Link
                href="/educator/reviews"
                className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm font-medium"
              >
                {pendingReviews} AI review{pendingReviews !== 1 ? 's' : ''} pending
              </Link>
            )}
            {openEvaluations > 0 && (
              <Link
                href="/educator/evaluations"
                className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm font-medium"
              >
                {openEvaluations} evaluation{openEvaluations !== 1 ? 's' : ''} open
              </Link>
            )}
            {openDiscipline > 0 && (
              <Link
                href="/educator/discipline"
                className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm font-medium"
              >
                {openDiscipline} discipline case{openDiscipline !== 1 ? 's' : ''} open
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-gray-500">No sessions yet in this tenant.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {recentSessions.map((session) => {
              const studentName =
                `${session.student.user.firstName} ${session.student.user.lastName}`.trim();
              return (
                <div key={session.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{studentName || 'Student'}</p>
                    <p className="text-sm text-gray-500">{session.subject}</p>
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(session.startedAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
