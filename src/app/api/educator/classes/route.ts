import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createClassSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1).max(200),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']),
  gradeLevel: z.number().int().min(1).max(12),
  academicYear: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = createClassSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

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
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
}
