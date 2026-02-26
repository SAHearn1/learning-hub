/**
 * IRT Student Ability Endpoint
 * GET /api/irt/ability?studentId=xxx&subject=MATH
 * Returns student's current ability estimate (theta) for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentAbility } from '@/lib/irt';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-errors';

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before ability access');
  }

  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get('studentId');
  const subject = searchParams.get('subject') as 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';

  if (!studentId || !subject) {
    throw new BadRequestError('Missing required parameters: studentId and subject');
  }

  if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
    throw new BadRequestError(
      'Invalid subject. Must be MATH, SCIENCE, LANGUAGE_ARTS, or FINANCIAL_LITERACY'
    );
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  if (user.role === 'STUDENT' && student.user.id !== user.id) {
    throw new ForbiddenError('Forbidden');
  }

  if (user.role !== 'STUDENT' && student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError('Forbidden');
  }

  const ability = await getStudentAbility(studentId, subject);

  if (!ability) {
    return NextResponse.json({
      message: 'No ability estimate available yet',
      theta: 0,
      standardError: 1,
      confidenceIntervalLower: -2,
      confidenceIntervalUpper: 2,
      reliabilityIndex: 0,
    });
  }

  return NextResponse.json(ability);
});
