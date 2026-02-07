import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const enrollSchema = z.object({
  studentId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
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
    body = enrollSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const targetClass = await db.class.findUnique({ where: { id: classId } });
  if (!targetClass) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  const student = await db.student.findUnique({ where: { id: body.studentId } });
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const enrollment = await db.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId: body.studentId } },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: targetClass.tenantId,
      classId,
      studentId: body.studentId,
    },
  });

  return NextResponse.json({ data: enrollment }, { status: 201 });
}
