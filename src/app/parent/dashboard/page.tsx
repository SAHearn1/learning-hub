import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/page-auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage() {
  const user = await requirePageUser(['PARENT']);

  const parent = await db.parent.findUnique({ where: { userId: user.id } });
  const childIds = parent?.childrenIds ?? [];

  const [children, openEvaluations, openDiscipline] = await Promise.all([
    childIds.length
      ? db.student.findMany({
          where: { id: { in: childIds } },
          include: {
            user: { select: { firstName: true, lastName: true, consentStatus: true } },
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: { subject: true, startedAt: true },
            },
            submissions: {
              where: { grade: { isNot: null } },
              orderBy: { submittedAt: 'desc' },
              take: 1,
              include: {
                grade: { select: { percentage: true, letterGrade: true } },
                assignment: { select: { title: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    childIds.length
      ? db.evaluationCase.count({
          where: { studentId: { in: childIds }, currentState: { not: 'CLOSED' } },
        })
      : Promise.resolve(0),
    childIds.length
      ? db.disciplineCase.count({
          where: { studentId: { in: childIds }, currentState: { not: 'CLOSED' } },
        })
      : Promise.resolve(0),
  ]);

  const pendingConsent = children.filter((c) => c.user.consentStatus !== 'GRANTED').length;

  if (!children.length) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Parent Dashboard</h1>
        <p className="text-gray-600 mb-6">No children linked to your account yet.</p>
        <Link
          href="/parent/settings"
          className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Go to Settings to link children
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Parent Dashboard</h1>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Children', value: children.length, warn: false },
          { label: 'Pending Consent', value: pendingConsent, warn: pendingConsent > 0 },
          { label: 'Open Evaluations', value: openEvaluations, warn: openEvaluations > 0 },
          { label: 'Open Discipline Cases', value: openDiscipline, warn: openDiscipline > 0 },
        ].map(({ label, value, warn }) => (
          <div
            key={label}
            className={`rounded-xl p-4 border ${warn ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold ${warn ? 'text-amber-700' : 'text-gray-900'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Children cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Your Children</h2>
        <div className="space-y-4">
          {children.map((child) => {
            const latestSession = child.sessions[0];
            const latestSubmission = child.submissions[0];
            const consentGranted = child.user.consentStatus === 'GRANTED';
            const childName = `${child.user.firstName} ${child.user.lastName}`.trim();
            return (
              <div
                key={child.id}
                className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{childName || 'Student'}</p>
                    <p className="text-sm text-gray-500">Grade {child.gradeLevel}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      consentGranted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {consentGranted ? 'Consent Granted' : 'Consent Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500 text-xs mb-1">Last Session</p>
                    {latestSession ? (
                      <>
                        <p className="font-medium">{latestSession.subject}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(latestSession.startedAt).toLocaleDateString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400">No sessions yet</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500 text-xs mb-1">Latest Grade</p>
                    {latestSubmission?.grade ? (
                      <>
                        <p className="font-medium">
                          {latestSubmission.grade.letterGrade} (
                          {latestSubmission.grade.percentage?.toFixed(0)}%)
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {latestSubmission.assignment.title}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400">No grades yet</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'View Activity', href: '/parent/activity' },
            { label: 'View Grades', href: '/parent/grades' },
            { label: 'Manage Consent', href: '/parent/consent' },
            { label: 'Children List', href: '/parent/children' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
