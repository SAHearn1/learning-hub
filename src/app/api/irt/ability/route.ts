/**
 * IRT Student Ability Endpoint
 * GET /api/irt/ability?studentId=xxx&subject=MATH
 * Returns student's current ability estimate (theta) for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
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

    const ability = await getStudentAbility(studentId, subject);

    if (!ability) {
      return NextResponse.json(
        {
          message: 'No ability estimate available yet',
          theta: 0,
          standardError: 1,
          confidenceIntervalLower: -2,
          confidenceIntervalUpper: 2,
          reliabilityIndex: 0,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(ability, { status: 200 });
  } catch (error) {
    console.error('Error fetching student ability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
