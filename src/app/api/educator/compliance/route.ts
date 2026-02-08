import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError } from '@/lib/api-errors';

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

export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const studentId = req.nextUrl.searchParams.get('studentId');

  if (studentId) {
    // Verify the student belongs to the educator's tenant
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { tenantId: true } } },
    });
    if (!student || student.user.tenantId !== user.tenantId) {
      throw new ForbiddenError();
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });

export const POST = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user || !['EDUCATOR', 'SCHOOL_ADMIN'].includes(user.role)) {
    throw new ForbiddenError();
  }

  const body = accommodationSchema.parse(await req.json());

  // Verify the student belongs to the educator's tenant
  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { tenantId: true } } },
  });
  if (!student || student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError();
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
  await db.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      action: 'CREATE_ACCOMMODATION',
      resource: 'IepAccommodation',
      resourceId: accommodation.id,
      metadata: { studentId: body.studentId, type: body.type },
    },
  });

  return NextResponse.json({ data: accommodation }, { status: 201 });
}, { rateLimit: { windowMs: 60_000, max: 30 } });
