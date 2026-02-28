/**
 * SRS Statistics Endpoint
 * GET /api/srs/stats?studentId=xxx&subject=MATH
 * Returns review statistics for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { getReviewStats } from '@/lib/srs';
import type { Subject } from '@prisma/client';

export const GET = withApiHandler(async (req: NextRequest) => {
  await requireUser();

  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get('studentId');
  const subject = searchParams.get('subject') as Subject | null;

  if (!studentId) {
    throw new ValidationError('Missing required parameter: studentId');
  }

    if (subject && !['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
    }

  const stats = await getReviewStats(studentId, subject || undefined);

  return NextResponse.json(stats);
});
