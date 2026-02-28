import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { GradesClient } from './grades-client';

export const dynamic = 'force-dynamic';

const EDUCATOR_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorGradesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  if (!EDUCATOR_ROLES.includes(user.role)) {
    redirect('/dashboard');
  }

  // Scope the query: EDUCATOR sees only their own classes; admins see the whole tenant
  const classWhere =
    user.role === 'EDUCATOR'
      ? { educatorId: user.id, tenantId: user.tenantId }
      : { tenantId: user.tenantId };

  const submissions = await db.submission.findMany({
    where: {
      grade: null,
      status: 'SUBMITTED',
      assignment: {
        class: classWhere,
      },
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      assignment: {
        select: {
          id: true,
          title: true,
          type: true,
          points: true,
          dueDate: true,
          classId: true,
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
    take: 50,
  });

  const submissionRows = submissions.map((s) => ({
    id: s.id,
    submittedAt: s.submittedAt.toISOString(),
    status: s.status,
    content: s.content,
    student: {
      id: s.student.id,
      gradeLevel: s.student.gradeLevel,
      user: {
        firstName: s.student.user.firstName,
        lastName: s.student.user.lastName,
      },
    },
    assignment: {
      id: s.assignment.id,
      title: s.assignment.title,
      type: s.assignment.type,
      points: s.assignment.points,
      dueDate: s.assignment.dueDate ? s.assignment.dueDate.toISOString() : null,
      classId: s.assignment.classId,
    },
  }));

  return <GradesClient submissions={submissionRows} />;
}
