import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function EducatorPerformancePage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const tenantId = user.tenantId;

  const educators = await db.educator.findMany({
    where: { user: { tenantId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const stats = await Promise.all(
    educators.map(async (e) => {
      const [classCount, goalCount, evalCount, reviewCount, approvedCount] = await Promise.all([
        db.class.count({ where: { educatorId: e.userId } }),
        db.iepGoal.count({ where: { tenantId, createdBy: e.userId, status: 'ACTIVE' } }),
        db.evaluationCase.count({ where: { tenantId, createdBy: e.userId, currentState: { not: 'CLOSED' } } }),
        db.aiSuggestionReview.count({ where: { reviewerId: e.userId } }),
        db.aiSuggestionReview.count({ where: { reviewerId: e.userId, reviewStatus: 'APPROVED' } }),
      ]);
      return {
        id: e.userId,
        name: `${e.user.firstName} ${e.user.lastName}`,
        classes: classCount,
        activeGoals: goalCount,
        openEvals: evalCount,
        reviews: reviewCount,
        approvalRate: reviewCount > 0 ? Math.round((approvedCount / reviewCount) * 100) : null,
      };
    }),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">Educator Performance</h1>
        <p className="mt-1 text-neutral-600">
          Caseload distribution and review metrics across educators.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">Educator</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Classes</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Active IEP Goals</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Open Evals</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">HITL Reviews</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Approval Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stats.map((s) => (
              <tr key={s.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-right">{s.classes}</td>
                <td className="px-4 py-3 text-right">{s.activeGoals}</td>
                <td className="px-4 py-3 text-right">{s.openEvals}</td>
                <td className="px-4 py-3 text-right">{s.reviews}</td>
                <td className="px-4 py-3 text-right">
                  {s.approvalRate !== null ? `${s.approvalRate}%` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
