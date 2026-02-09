import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { appendImmutableAuditLog } from '@/lib/audit';
import { assertTenantAccess } from '@/lib/rbac';

const accommodationSchema = z.object({
  studentId: z.string().min(1),
  type: z.enum([
    'EXTENDED_TIME', 'REDUCED_STIMULI', 'SIMPLIFIED_MODE', 'TEXT_TO_SPEECH',
    'FREQUENT_BREAKS', 'CHUNKED_CONTENT', 'MODIFIED_DIFFICULTY', 'VISUAL_SUPPORTS',
    'AUDIO_SUPPORTS', 'ALTERNATIVE_ASSESSMENT',
  ]),
  description: z.string().min(1),
  parameters: z.record(z.unknown()).default({}),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s)).optional(),
});

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const studentId = req.nextUrl.searchParams.get('studentId');

  if (studentId) {
    // Verify the student belongs to the educator's tenant
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { tenantId: true } } },
    });
    if (!student) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
      assertTenantAccess(user.role, user.tenantId, student.user.tenantId);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accommodations = await db.iepAccommodation.findMany({
      where: { studentId },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json({ data: accommodations });
  }

  // List all students with active IEP accommodations in the tenant
  const students = await db.student.findMany({
    where: {
      user: { tenantId: user.tenantId },
      iepAccommodations: { some: { active: true } },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      iepAccommodations: { where: { active: true } },
    },
    orderBy: { user: { lastName: 'asc' } },
  });

  return NextResponse.json({ data: students });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = accommodationSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Verify the student belongs to the educator's tenant
  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { tenantId: true } } },
  });
  if (!student || student.user.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accommodation = await db.iepAccommodation.create({
    data: {
      studentId: body.studentId,
      type: body.type,
      description: body.description,
      parameters: body.parameters as Prisma.InputJsonValue,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
    },
  });

  // Audit log
  await appendImmutableAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'CREATE_ACCOMMODATION',
    resource: 'IepAccommodation',
    resourceId: accommodation.id,
    metadata: { studentId: body.studentId, type: body.type },
  });

  return NextResponse.json({ data: accommodation }, { status: 201 });
}
