import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';
import { JoinClassClient } from './join-class-client';

function formatSubject(subject: string): string {
  return subject
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default async function StudentClassesPage() {
  const user = await requirePageUser(['STUDENT']);

  const enrollments = user.student
    ? await db.classEnrollment.findMany({
        where: { studentId: user.student.id, status: 'ACTIVE' },
        include: {
          class: {
            include: {
              educator: { select: { firstName: true, lastName: true } },
              _count: { select: { enrollments: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold text-neutral-900">My Classes</h1>

      <JoinClassClient />

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Enrolled Classes</h2>
        {enrollments.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-600">
            No classes yet. Enter a class ID above to join your first class.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrollments.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-neutral-900">{e.class.name}</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  {formatSubject(e.class.subject)} &middot; Grade {e.class.gradeLevel}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  Educator: {e.class.educator.firstName} {e.class.educator.lastName}
                </p>
                <p className="text-xs text-neutral-400 mt-2">
                  {e.class._count.enrollments} enrolled &middot; Joined{' '}
                  {new Date(e.enrolledAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
