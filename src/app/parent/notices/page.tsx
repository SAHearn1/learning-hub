import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ParentNoticeCard } from '@/components/safeguards/ParentNoticeCard';
import type { ParentNoticeRow } from '@/components/safeguards/ParentNoticeCard';

export const dynamic = 'force-dynamic';

export default async function ParentNoticesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'PARENT') redirect('/dashboard');

  const parent = user.parent;
  if (!parent) redirect('/dashboard');

  // Find all students linked to this parent
  const childUserIds = parent.childrenIds;
  const students = await db.student.findMany({
    where: { userId: { in: childUserIds } },
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  });

  const studentIds = students.map((s) => s.id);

  // Fetch all notices for all of the parent's children
  const notices = await db.safeguardsNotice.findMany({
    where: {
      tenantId: user.tenantId,
      studentId: { in: studentIds },
      deliveryStatus: { in: ['DELIVERED', 'ACKNOWLEDGED'] },
    },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const noticeRows: (ParentNoticeRow & { studentName: string })[] = notices.map((n) => ({
    id: n.id,
    trigger: n.trigger,
    deliveryMethod: n.deliveryMethod,
    deliveryStatus: n.deliveryStatus,
    deliveredAt: n.deliveredAt?.toISOString() ?? null,
    acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
    artifactRef: n.artifactRef,
    schoolYear: n.schoolYear,
    createdAt: n.createdAt.toISOString(),
    studentName: `${n.student.user.firstName} ${n.student.user.lastName}`,
  }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Procedural Safeguards Notices</h1>
        <p className="mt-1 text-neutral-600">
          Review and acknowledge your procedural safeguards notices under IDEA.
        </p>
      </div>

      {noticeRows.length === 0 ? (
        <p className="text-sm text-neutral-500">No notices are available at this time.</p>
      ) : (
        <div className="space-y-4">
          {noticeRows.map((notice) => (
            <div key={notice.id}>
              <p className="mb-1 text-xs font-medium text-neutral-500">
                Student: {notice.studentName}
              </p>
              <ParentNoticeCard notice={notice} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
