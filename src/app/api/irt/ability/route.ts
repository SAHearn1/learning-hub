/**
 * IRT Student Ability Endpoint
 * GET /api/irt/ability?studentId=xxx&subject=MATH
 * Returns student's current ability estimate (theta) for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/api-errors';
import { getStudentAbility } from '@/lib/irt';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const subject = searchParams.get('subject') as 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';

    if (!studentId || !subject) {
      return NextResponse.json(
        { error: 'Missing required parameters: studentId and subject' },
        { status: 400 }
      );
    }

    if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
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
