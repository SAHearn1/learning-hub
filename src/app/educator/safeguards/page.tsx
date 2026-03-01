import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { StaffPsnPanel } from '@/components/safeguards/StaffPsnPanel';
import type { PsnNoticeRow, PsnEventRow } from '@/components/safeguards/StaffPsnPanel';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorSafeguardsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!STAFF_ROLES.includes(user.role)) redirect('/dashboard');

  const params = await searchParams;
  const studentId = params.studentId;

  if (!studentId) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <h1 className="text-2xl font-bold text-neutral-900">Procedural Safeguards</h1>
        <p className="text-neutral-600">
          Select a student from the roster to manage their IDEA procedural safeguards notices.
        </p>
      </main>
    );
  }

  const [notices, events] = await Promise.all([
    db.safeguardsNotice.findMany({
      where: { tenantId: user.tenantId, studentId },
      include: { proceduralEvent: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.proceduralEvent.findMany({
      where: { tenantId: user.tenantId, studentId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const noticeRows: PsnNoticeRow[] = notices.map((n) => ({
    id: n.id,
    trigger: n.trigger,
    deliveryMethod: n.deliveryMethod,
    deliveryStatus: n.deliveryStatus,
    deliveredAt: n.deliveredAt?.toISOString() ?? null,
    acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
    noticeDocHash: n.noticeDocHash,
    artifactRef: n.artifactRef,
    schoolYear: n.schoolYear,
    createdAt: n.createdAt.toISOString(),
    proceduralEvent: {
      id: n.proceduralEvent.id,
      eventType: n.proceduralEvent.eventType,
      trigger: n.proceduralEvent.trigger,
      correlationId: n.proceduralEvent.correlationId,
      isFirstOfType: n.proceduralEvent.isFirstOfType,
      createdAt: n.proceduralEvent.createdAt.toISOString(),
    },
  }));

  const eventRows: PsnEventRow[] = events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    trigger: e.trigger,
    schoolYear: e.schoolYear,
    correlationId: e.correlationId,
    isFirstOfType: e.isFirstOfType,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Procedural Safeguards</h1>
        {student && (
          <p className="mt-1 text-neutral-600">
            {student.user.firstName} {student.user.lastName}
          </p>
        )}
      </div>
      <StaffPsnPanel studentId={studentId} notices={noticeRows} events={eventRows} />
    </main>
  );
}
