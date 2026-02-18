import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, ValidationError } from '@/lib/api-errors';

const createCourseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  gradeLevel: z.array(z.number().int().min(0).max(12)).min(1),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators and administrators can view courses');
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);
  const subject = req.nextUrl.searchParams.get('subject');

  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (subject) where.subject = subject;

  const [courses, total] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { classes: true } } },
    }),
    db.course.count({ where }),
  ]);

  return NextResponse.json({ data: courses, total, page, limit });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators and administrators can create courses');
  }

  const body = createCourseSchema.parse(await req.json());

  const course = await db.course.create({
    data: {
      tenantId: user.tenantId,
      name: body.name,
      description: body.description,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
    },
  });

  return NextResponse.json({ data: course }, { status: 201 });
});
