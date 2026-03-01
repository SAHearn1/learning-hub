import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ParentReferralForm } from '@/components/evaluation/ParentReferralForm';
import { ParentCaseView } from '@/components/evaluation/ParentCaseView';
import type { ParentCaseData } from '@/components/evaluation/ParentCaseView';

export const dynamic = 'force-dynamic';

export default async function ParentEvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'PARENT') redirect('/dashboard');

  const parent = await db.parent.findUnique({
    where: { userId: user.id },
  });

  if (!parent || parent.childrenIds.length === 0) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-bold text-neutral-900">Evaluations</h1>
        <p className="text-neutral-600">No children linked to your account.</p>
      </main>
    );
  }

  const students = await db.student.findMany({
    where: { userId: { in: parent.childrenIds } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const cases = await db.evaluationCase.findMany({
    where: {
      tenantId: user.tenantId,
      studentId: { in: students.map((s) => s.id) },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Evaluations</h1>
      <p className="text-neutral-600">
        View evaluation cases and request evaluations for your child under 34 CFR
        &sect;300.504(a)(1).
      </p>

      {students.map((student) => {
        const studentCases: ParentCaseData[] = cases
          .filter((c) => c.studentId === student.id)
          .map((c) => ({
            id: c.id,
            caseType: c.caseType,
            currentState: c.currentState,
            referralDate: c.referralDate?.toISOString() ?? null,
            evaluationDueDate: c.evaluationDueDate?.toISOString() ?? null,
            createdAt: c.createdAt.toISOString(),
          }));

        return (
          <div key={student.id} className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              {student.user.firstName} {student.user.lastName}
            </h2>

            <ParentCaseView cases={studentCases} />
            <ParentReferralForm studentId={student.id} />
          </div>
        );
      })}
    </main>
  );
}
