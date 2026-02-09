import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError } from '@/lib/api-errors';

const createClassSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1).max(200),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']),
  gradeLevel: z.number().int().min(1).max(12),
  academicYear: z.string().min(1),
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const body = createClassSchema.parse(await req.json());

  const newClass = await db.class.create({
    data: {
      tenantId: user.tenantId,
      schoolId: body.schoolId,
      name: body.name,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      academicYear: body.academicYear,
      educatorId: user.id,
    },
  });

  return NextResponse.json({ data: newClass }, { status: 201 });
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const where = user.role === 'EDUCATOR'
    ? { educatorId: user.id }
    : { tenantId: user.tenantId };

  const classes = await db.class.findMany({
    where,
    include: {
      school: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: classes });
});
