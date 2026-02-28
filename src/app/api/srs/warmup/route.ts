/**
 * SRS Daily Warmup Endpoint
 * GET /api/srs/warmup?studentId=xxx&subject=MATH&maxItems=20
 * Generates a curated Daily Warmup of review items
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { generateDailyWarmup } from '@/lib/srs';
import type { Subject } from '@prisma/client';

export const GET = withApiHandler(async (req: NextRequest) => {
  await requireUser();

  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get('studentId');
  const subject = searchParams.get('subject') as Subject | null;
  const maxItems = searchParams.get('maxItems');

  if (!studentId) {
    throw new ValidationError('Missing required parameter: studentId');
  }

    if (subject && !['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
    }

  const warmup = await generateDailyWarmup(
    studentId,
    subject || undefined,
    maxItems ? parseInt(maxItems) : 20
  );

  return NextResponse.json(warmup);
});
