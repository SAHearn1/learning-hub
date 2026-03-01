import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Deadline = { id: string; label: string; date: Date; type: string; urgency: string };

function getUrgency(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 3 * 24 * 60 * 60 * 1000) return 'urgent';
  if (diff < 7 * 24 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

const urgencyColors: Record<string, string> = {
  overdue: 'bg-red-100 text-red-800 border-red-200',
  urgent: 'bg-amber-100 text-amber-800 border-amber-200',
  soon: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  ok: 'bg-green-50 text-green-800 border-green-200',
};

export default async function CalendarPage() {
  const user = await requirePageUser([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const [evalCases, goals, disciplineCases] = await Promise.all([
    db.evaluationCase.findMany({
      where: { tenantId: user.tenantId, currentState: { not: 'CLOSED' } },
      select: { id: true, evaluationDueDate: true, studentId: true, currentState: true },
    }),
    db.iepGoal.findMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE' },
      select: { id: true, goalCode: true, targetDate: true },
    }),
    db.disciplineCase.findMany({
      where: { tenantId: user.tenantId, isChangeOfPlacement: true, manifestDetermination: null, currentState: { not: 'CLOSED' } },
      select: { id: true, removalStartDate: true, studentId: true },
    }),
  ]);

  const deadlines: Deadline[] = [];

  for (const c of evalCases) {
    if (c.evaluationDueDate) {
      deadlines.push({
        id: c.id,
        label: `Evaluation due (${c.currentState}) — Student ${c.studentId.slice(0, 8)}`,
        date: c.evaluationDueDate,
        type: 'Evaluation',
        urgency: getUrgency(c.evaluationDueDate),
      });
    }
  }

  for (const g of goals) {
    deadlines.push({
      id: g.id,
      label: `IEP Goal ${g.goalCode} target date`,
      date: g.targetDate,
      type: 'IEP Goal',
      urgency: getUrgency(g.targetDate),
    });
  }

  for (const d of disciplineCases) {
    const mdrDeadline = new Date(d.removalStartDate);
    mdrDeadline.setDate(mdrDeadline.getDate() + 14);
    deadlines.push({
      id: d.id,
      label: `MDR required — Student ${d.studentId.slice(0, 8)}`,
      date: mdrDeadline,
      type: 'Discipline',
      urgency: getUrgency(mdrDeadline),
    });
  }

  deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">Compliance Calendar</h1>
        <p className="mt-1 text-neutral-600">
          Upcoming IDEA compliance deadlines across evaluations, IEP goals, and discipline.
        </p>
      </div>

      {deadlines.length === 0 ? (
        <div className="rounded-lg border bg-neutral-50 p-8 text-center text-neutral-500">
          No upcoming deadlines.
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => (
            <div
              key={d.id}
              className={`flex items-center justify-between rounded-lg border p-4 ${urgencyColors[d.urgency]}`}
            >
              <div>
                <p className="text-sm font-medium">{d.label}</p>
                <p className="text-xs opacity-75">{d.type}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">{d.date.toLocaleDateString()}</p>
                <p className="text-xs capitalize">{d.urgency}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
