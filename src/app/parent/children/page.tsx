import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ParentChildrenPage() {
  const user = await requirePageUser(['PARENT']);

  const childUserIds = user.parent?.childrenIds ?? [];

  const children =
    childUserIds.length > 0
      ? await db.student.findMany({
          where: { userId: { in: childUserIds } },
          include: {
            user: { select: { firstName: true, lastName: true, email: true, consentStatus: true } },
            _count: { select: { sessions: true, submissions: true } },
          },
          orderBy: { user: { lastName: 'asc' } },
        })
      : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">My Children</h1>
        <p className="mt-2 text-neutral-600">Children linked to your parent account.</p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-600">No children linked yet.</p>
          <Link href="/parent/settings" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Link a student account →
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {children.map((child) => {
            const name =
              [child.user.firstName, child.user.lastName].filter(Boolean).join(' ') || child.user.email;
            const consentColor =
              child.user.consentStatus === 'GRANTED'
                ? 'text-green-700 bg-green-50'
                : child.user.consentStatus === 'PENDING'
                  ? 'text-amber-700 bg-amber-50'
                  : 'text-neutral-600 bg-neutral-100';

            return (
              <li
                key={child.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-neutral-900">{name}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    Grade {child.gradeLevel} &middot; {child._count.sessions} session
                    {child._count.sessions !== 1 ? 's' : ''} &middot; {child._count.submissions} submission
                    {child._count.submissions !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${consentColor}`}>
                    {child.user.consentStatus ?? 'Unknown'}
                  </span>
                  <Link href="/parent/activity" className="text-sm text-blue-600 hover:underline font-medium">
                    View activity →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
