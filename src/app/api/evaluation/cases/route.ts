import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { createCase, getCasesForStudent } from '@/lib/evaluation/evaluation.service';

const CASE_TYPES = ['INITIAL', 'REEVALUATION', 'DISMISSAL'] as const;

const createSchema = z.object({
  studentId: z.string().min(1),
  caseType: z.enum(CASE_TYPES),
  stateCode: z.string().length(2).optional(),
  referralSource: z.string().optional(),
  referralReason: z.string().optional(),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId query param required' }, { status: 400 });
  }

  const cases = await getCasesForStudent(user.tenantId, studentId);
  return NextResponse.json({ data: cases });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const body = createSchema.parse(await req.json());

  const evalCase = await createCase({
    tenantId: user.tenantId,
    studentId: body.studentId,
    caseType: body.caseType,
    stateCode: body.stateCode,
    referralSource: body.referralSource,
    referralReason: body.referralReason,
    createdBy: user.id,
  });

  return NextResponse.json({ data: evalCase }, { status: 201 });
});
