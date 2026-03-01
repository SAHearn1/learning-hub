import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const tenantId = user.tenantId;

  const [
    totalStudents, totalEducators, totalClasses,
    totalSessions, totalAssessments,
    totalGoals, activeGoals,
    totalEvalCases, openEvalCases,
    totalDisciplineCases,
  ] = await Promise.all([
    db.student.count({ where: { user: { tenantId } } }),
    db.educator.count({ where: { user: { tenantId } } }),
    db.class.count({ where: { tenantId } }),
    db.session.count({ where: { tenantId } }),
    db.assessment.count({ where: { session: { tenantId } } }),
    db.iepGoal.count({ where: { tenantId } }),
    db.iepGoal.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.evaluationCase.count({ where: { tenantId } }),
    db.evaluationCase.count({ where: { tenantId, currentState: { not: 'CLOSED' } } }),
    db.disciplineCase.count({ where: { tenantId } }),
  ]);

  const metrics = [
    { label: 'Students', value: totalStudents, color: 'bg-blue-50 text-blue-800' },
    { label: 'Educators', value: totalEducators, color: 'bg-green-50 text-green-800' },
    { label: 'Classes', value: totalClasses, color: 'bg-purple-50 text-purple-800' },
    { label: 'AI Tutoring Sessions', value: totalSessions, color: 'bg-indigo-50 text-indigo-800' },
    { label: 'Assessments', value: totalAssessments, color: 'bg-cyan-50 text-cyan-800' },
    { label: 'IEP Goals (Active/Total)', value: `${activeGoals}/${totalGoals}`, color: 'bg-amber-50 text-amber-800' },
    { label: 'Eval Cases (Open/Total)', value: `${openEvalCases}/${totalEvalCases}`, color: 'bg-orange-50 text-orange-800' },
    { label: 'Discipline Cases', value: totalDisciplineCases, color: 'bg-red-50 text-red-800' },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">School Analytics</h1>
        <p className="mt-1 text-neutral-600">
          Overview of enrollment, academic activity, and compliance metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-lg border p-5 ${m.color}`}>
            <p className="text-xs font-medium uppercase opacity-75">{m.label}</p>
            <p className="mt-1 text-2xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
