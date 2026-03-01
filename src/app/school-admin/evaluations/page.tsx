import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CaseStatusBadge } from '@/components/evaluation/CaseStatusBadge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function SchoolAdminEvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!ADMIN_ROLES.includes(user.role)) redirect('/dashboard');

  const cases = await db.evaluationCase.findMany({
    where: { tenantId: user.tenantId },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const openCount = cases.filter((c) => c.currentState !== 'CLOSED').length;
  const overdueCount = cases.filter(
    (c) =>
      c.evaluationDueDate &&
      new Date(c.evaluationDueDate) < new Date() &&
      c.currentState !== 'CLOSED'
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">All Evaluation Cases</h1>
          <p className="mt-1 text-neutral-600">
            {cases.length} total &middot; {openCount} open &middot;{' '}
            <span className={overdueCount > 0 ? 'text-red-600 font-medium' : ''}>
              {overdueCount} overdue
            </span>
          </p>
        </div>
        <Link
          href="/school-admin/evaluations/compliance"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Compliance Dashboard
        </Link>
      </div>

      {cases.length === 0 ? (
        <p className="text-neutral-500">No evaluation cases found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="pb-2 pr-4">Student</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Referral</th>
                <th className="pb-2 pr-4">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium text-neutral-900">
                    <Link
                      href={`/educator/evaluations/${c.id}`}
                      className="hover:text-blue-600"
                    >
                      {c.student.user.firstName} {c.student.user.lastName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">
                    {c.caseType === 'INITIAL'
                      ? 'Initial'
                      : c.caseType === 'REEVALUATION'
                        ? 'Reeval'
                        : 'Dismissal'}
                  </td>
                  <td className="py-3 pr-4">
                    <CaseStatusBadge state={c.currentState} />
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">
                    {c.referralDate
                      ? new Date(c.referralDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    {c.evaluationDueDate ? (
                      <span
                        className={
                          new Date(c.evaluationDueDate) < new Date() &&
                          c.currentState !== 'CLOSED'
                            ? 'text-red-600 font-medium'
                            : 'text-neutral-600'
                        }
                      >
                        {new Date(c.evaluationDueDate).toLocaleDateString()}
                        {new Date(c.evaluationDueDate) < new Date() &&
                          c.currentState !== 'CLOSED' && ' OVERDUE'}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
