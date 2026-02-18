import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';

const createAssignmentSchema = z.object({
  classId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['HOMEWORK', 'QUIZ', 'TEST', 'PROJECT', 'DISCUSSION', 'FIVE_R_SESSION']).default('HOMEWORK'),
  dueDate: z.string().datetime().optional(),
  points: z.number().int().min(0).max(1000).default(100),
  rubric: z.record(z.unknown()).optional(),
  published: z.boolean().default(false),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

  const classId = req.nextUrl.searchParams.get('classId');
  const studentView = req.nextUrl.searchParams.get('studentView') === 'true';

  if (!classId) {
    throw new ValidationError('classId is required');
  }

  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  if (user.role === 'STUDENT') {
    if (!user.student) {
      throw new ForbiddenError('Student profile required');
    }

    const enrollment = await db.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId: user.student.id } },
      select: { status: true },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new ForbiddenError('You are not enrolled in this class');
    }
  }

  // Students can only see published assignments
  if (user.role === 'STUDENT' || studentView) {
    const assignments = await db.assignment.findMany({
      where: { classId, published: true },
      orderBy: { dueDate: 'asc' },
      include: {
        submissions: user.student ? {
          where: { studentId: user.student.id },
          include: { grade: true },
        } : false,
        _count: { select: { submissions: true } },
      },
    });
    return NextResponse.json({ data: assignments });
  }

  // Educators see all assignments
  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Access denied');
  }

  const assignments = await db.assignment.findMany({
    where: { classId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { submissions: true } } },
  });

  return NextResponse.json({ data: assignments });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators can create assignments');
  }

  const body = createAssignmentSchema.parse(await req.json());

  const cls = await db.class.findUnique({ where: { id: body.classId } });
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  const assignment = await db.assignment.create({
    data: {
      tenantId: user.tenantId,
      classId: body.classId,
      createdById: user.id,
      title: body.title,
      description: body.description,
      type: body.type,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      points: body.points,
      rubric: (body.rubric as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      published: body.published,
    },
  });

  return NextResponse.json({ data: assignment }, { status: 201 });
});
