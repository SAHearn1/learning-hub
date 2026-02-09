/**
 * SRS Statistics Endpoint
 * GET /api/srs/stats?studentId=xxx&subject=MATH
 * Returns review statistics for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReviewStats } from '@/lib/srs';
import type { Subject } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const subject = searchParams.get('subject') as Subject | null;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: studentId' },
        { status: 400 }
      );
    }

    if (subject && !['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
    }

    const stats = await getReviewStats(studentId, subject || undefined);

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
