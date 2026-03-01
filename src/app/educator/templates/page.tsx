import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PHASE_LABELS: Record<string, string> = {
  ROOT: 'Root',
  REGULATE: 'Regulate',
  REFLECT: 'Reflect',
  RESTORE: 'Restore',
  RECONNECT: 'Reconnect',
};

export default async function EducatorTemplatesPage() {
  const user = await requirePageUser([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const templates = await db.fiveRTemplate.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C3B2E]">5R Lesson Templates</h1>
          <p className="mt-1 text-neutral-600">
            Create and manage lesson templates aligned to the 5Rs framework.
          </p>
        </div>
        <a
          href="/api/lms/templates"
          className="rounded-md bg-[#0C3B2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3B2E]/90"
        >
          + New Template
        </a>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-500">
          No templates yet. Create your first 5R lesson template.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const phases = (t.phases as Array<{ phase: string; durationMinutes: number }>) ?? [];
            return (
              <div key={t.id} className="rounded-lg border bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-[#0C3B2E]">{t.name}</h3>
                {t.description && (
                  <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{t.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {phases.map((p) => (
                    <span
                      key={p.phase}
                      className="rounded-full bg-[#0C3B2E]/10 px-2 py-0.5 text-xs font-medium text-[#0C3B2E]"
                    >
                      {PHASE_LABELS[p.phase] ?? p.phase} ({p.durationMinutes}m)
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                  <span>{t.subject} &bull; {t.totalDurationMinutes}min</span>
                  <span>{t._count.assignments} assignment{t._count.assignments !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
