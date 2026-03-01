import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import {
  createDisciplineCase,
  getCasesForStudent,
} from '@/lib/discipline/discipline.service';

const REMOVAL_TYPES = [
  'IN_SCHOOL_SUSPENSION',
  'OUT_OF_SCHOOL_SUSPENSION',
  'EXPULSION',
  'BUS_SUSPENSION',
  'OTHER',
] as const;

const createSchema = z.object({
  studentId: z.string().min(1),
  removalType: z.enum(REMOVAL_TYPES),
  removalStartDate: z.string().min(1),
  removalEndDate: z.string().optional(),
  removalDays: z.number().int().positive(),
  incidentDescription: z.string().min(1),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json(
      { error: 'studentId query param required' },
      { status: 400 },
    );
  }

  const cases = await getCasesForStudent(user.tenantId, studentId);
  return NextResponse.json({ data: cases });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const dCase = await createDisciplineCase({
    tenantId: user.tenantId,
    studentId: body.studentId,
    removalType: body.removalType,
    removalStartDate: body.removalStartDate,
    removalEndDate: body.removalEndDate,
    removalDays: body.removalDays,
    incidentDescription: body.incidentDescription,
    createdBy: user.id,
  });

  return NextResponse.json({ data: dCase }, { status: 201 });
});
