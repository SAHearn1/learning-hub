import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { StudentDashboardClient, type StudentDashboardData } from './student-dashboard-client';

export const dynamic = 'force-dynamic';

async function getStudentId(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return null;
  if (user.role !== 'STUDENT') return null;
  if (user.student) return user.student.id;

  // Defensive: ensure a Student profile exists (webhook/provisioning can be delayed).
  const student = await db.student.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      gradeLevel: 6,
      learningPreferences: {},
      regulationProfile: {
        dysregulationTriggers: [],
        calmingStrategies: [],
        preferredBreakDuration: 5,
      },
    },
    select: { id: true },
  });

  return student.id;
}

export default async function StudentDashboardPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 px-6 py-10">
        <h1 className="text-2xl font-bold text-[#0C3B2E]">Setup Required</h1>
        <p className="text-sm text-neutral-700">
          This environment is missing <code className="rounded bg-neutral-100 px-1">DATABASE_URL</code>, so the student
          dashboard cannot load.
        </p>
        <p className="text-sm text-neutral-700">
          Set <code className="rounded bg-neutral-100 px-1">DATABASE_URL</code> (and typically{' '}
          <code className="rounded bg-neutral-100 px-1">DIRECT_URL</code> for migrations) in your deployment or local
          environment.
        </p>
      </main>
    );
  }

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('StudentDashboard: failed to get user, falling back to /learn', err);
    redirect('/learn');
  }
  if (!user) redirect('/sign-in');
  if (user.role !== 'STUDENT') redirect('/dashboard');

  const studentId = await getStudentId(user);
  if (!studentId) redirect('/dashboard');

  const enrollments = await db.classEnrollment.findMany({
    where: { studentId, status: 'ACTIVE' },
    include: {
      class: {
        include: {
          educator: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
    take: 12,
  });

  const classes: StudentDashboardData['classes'] = enrollments.map((e) => ({
    id: e.class.id,
    name: e.class.name,
    subject: e.class.subject,
    gradeLevel: e.class.gradeLevel,
    academicYear: e.class.academicYear,
    educatorName: `${e.class.educator.firstName} ${e.class.educator.lastName}`.trim(),
  }));

  const classIds = classes.map((c) => c.id);

  const now = new Date();
  const upcomingAssignmentsRaw = classIds.length
    ? await db.assignment.findMany({
        where: {
          classId: { in: classIds },
          published: true,
          OR: [{ dueDate: null }, { dueDate: { gte: now } }],
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          class: { select: { id: true, name: true, subject: true } },
          submissions: {
            where: { studentId },
            include: { grade: true },
          },
        },
      })
    : [];

  const upcomingAssignments: StudentDashboardData['upcomingAssignments'] = upcomingAssignmentsRaw.map((a) => {
    const sub = a.submissions[0] ?? null;
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      dueDate: a.dueDate?.toISOString() ?? null,
      points: a.points,
      class: a.class,
      submission: sub
        ? {
            id: sub.id,
            status: sub.status,
            submittedAt: sub.submittedAt.toISOString(),
            grade: sub.grade
              ? {
                  score: sub.grade.score,
                  percentage: sub.grade.percentage,
                  letterGrade: sub.grade.letterGrade,
                }
              : null,
          }
        : null,
    };
  });

  const recentSession = await db.session.findFirst({
    where: { studentId },
    orderBy: { startedAt: 'desc' },
    select: { id: true, subject: true, startedAt: true, endedAt: true },
  });

  const data: StudentDashboardData = {
    firstName: user.firstName,
    classes,
    upcomingAssignments,
    recentSession: recentSession
      ? {
          id: recentSession.id,
          subject: recentSession.subject,
          startedAt: recentSession.startedAt.toISOString(),
          endedAt: recentSession.endedAt?.toISOString() ?? null,
        }
      : null,
  };

  return <StudentDashboardClient initialData={data} />;
}

