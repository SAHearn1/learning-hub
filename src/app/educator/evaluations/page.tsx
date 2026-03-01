import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CaseStatusBadge } from '@/components/evaluation/CaseStatusBadge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorEvaluationsPage({
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

  const cases = await db.evaluationCase.findMany({
    where: whereClause,
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Evaluation Cases</h1>
      <p className="text-neutral-600">
        Manage evaluation referrals, consent, assessments, and eligibility determinations.
      </p>

      {cases.length === 0 ? (
        <p className="text-neutral-500">No evaluation cases found.</p>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/educator/evaluations/${c.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-900">
                  {c.student.user.firstName} {c.student.user.lastName}
                </span>
                <CaseStatusBadge state={c.currentState} />
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span>
                  {c.caseType === 'INITIAL'
                    ? 'Initial Evaluation'
                    : c.caseType === 'REEVALUATION'
                      ? 'Reevaluation'
                      : 'Dismissal'}
                </span>
                {c.referralDate && (
                  <span>Referred: {new Date(c.referralDate).toLocaleDateString()}</span>
                )}
                {c.evaluationDueDate && (
                  <span>
                    Due: {new Date(c.evaluationDueDate).toLocaleDateString()}
                    {new Date(c.evaluationDueDate) < new Date() &&
                      c.currentState !== 'CLOSED' && (
                        <span className="ml-1 text-red-600 font-medium">OVERDUE</span>
                      )}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
