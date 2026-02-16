import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireUser();

  const { classId } = await ctx.params;

  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  // Students see only published
  const wherePublished = user.role === 'STUDENT' ? { published: true } : {};

  const assignments = await db.assignment.findMany({
    where: { classId, ...wherePublished },
    orderBy: { dueDate: 'asc' },
    include: {
      _count: { select: { submissions: true } },
      ...(user.student ? {
        submissions: {
          where: { studentId: user.student.id },
          select: { id: true, status: true, grade: { select: { score: true, percentage: true, letterGrade: true } } },
        },
      } : {}),
    },
  });

  return NextResponse.json({ data: assignments });
});
