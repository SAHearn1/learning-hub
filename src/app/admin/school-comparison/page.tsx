import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function SchoolComparisonPage() {
  const user = await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const tenantId = user.tenantId;

  const schools = await db.school.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });

  const stats = await Promise.all(
    schools.map(async (s) => {
      const [students, educators, classes, sessions, evalCases, discCases] = await Promise.all([
        db.user.count({ where: { schoolId: s.id, role: 'STUDENT' } }),
        db.user.count({ where: { schoolId: s.id, role: 'EDUCATOR' } }),
        db.class.count({ where: { schoolId: s.id } }),
        db.session.count({ where: { tenantId } }),
        db.evaluationCase.count({ where: { tenantId, currentState: { not: 'CLOSED' } } }),
        db.disciplineCase.count({ where: { tenantId, currentState: { not: 'CLOSED' } } }),
      ]);
      return { ...s, students, educators, classes, sessions, evalCases, discCases };
    }),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">School Comparison</h1>
        <p className="mt-1 text-neutral-600">
          Side-by-side metrics across schools in the district.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">School</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Students</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Educators</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Classes</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">AI Sessions</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Open Evals</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600">Open Discipline</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stats.map((s) => (
              <tr key={s.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-right">{s.students}</td>
                <td className="px-4 py-3 text-right">{s.educators}</td>
                <td className="px-4 py-3 text-right">{s.classes}</td>
                <td className="px-4 py-3 text-right">{s.sessions}</td>
                <td className="px-4 py-3 text-right">{s.evalCases}</td>
                <td className="px-4 py-3 text-right">{s.discCases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
