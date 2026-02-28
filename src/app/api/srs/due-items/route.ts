/**
 * SRS Due Items Endpoint
 * GET /api/srs/due-items?studentId=xxx&subject=MATH&limit=20
 * Returns items due for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { getDueItems } from '@/lib/srs';
import type { Subject } from '@prisma/client';

export const GET = withApiHandler(async (req: NextRequest) => {
  await requireUser();

  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get('studentId');
  const subject = searchParams.get('subject') as Subject | null;
  const limit = searchParams.get('limit');

  if (!studentId) {
    throw new ValidationError('Missing required parameter: studentId');
  }

    if (subject && !['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
    }

  const dueItems = await getDueItems(
    studentId,
    subject || undefined,
    limit ? parseInt(limit) : undefined
  );

  return NextResponse.json({
    count: dueItems.length,
    items: dueItems,
  });
});
