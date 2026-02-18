import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/api-errors';

export const GET = withApiHandler(async () => {
  const user = await requireUser();

  if (user.role !== 'STUDENT') {
    throw new ForbiddenError('Only students can list their classes');
  }

  // Defensive: ensure a Student profile exists (webhook/provisioning can be delayed).
  const student = user.student
    ? { id: user.student.id }
    : await db.student.upsert({
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

  const enrollments = await db.classEnrollment.findMany({
    where: { studentId: student.id, status: 'ACTIVE' },
    include: {
      class: {
        include: {
          educator: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  const classes = enrollments.map((e) => ({
    id: e.class.id,
    name: e.class.name,
    subject: e.class.subject,
    gradeLevel: e.class.gradeLevel,
    academicYear: e.class.academicYear,
    educatorName: `${e.class.educator.firstName} ${e.class.educator.lastName}`.trim(),
    enrolledAt: e.enrolledAt,
  }));

  return NextResponse.json({ data: classes });
});

