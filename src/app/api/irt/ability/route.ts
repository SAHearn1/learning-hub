/**
 * IRT Student Ability Endpoint
 * GET /api/irt/ability?studentId=xxx&subject=MATH
 * Returns student's current ability estimate (theta) for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/api-errors';
import { getStudentAbility } from '@/lib/irt';

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get('studentId');
  const subject = searchParams.get('subject') as 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS';

  if (!studentId || !subject) {
    throw new ValidationError('Missing required parameters: studentId and subject');
  }

  if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS'].includes(subject)) {
    throw new ValidationError('Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS');
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
