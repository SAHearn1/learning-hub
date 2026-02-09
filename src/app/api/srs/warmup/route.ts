/**
 * SRS Daily Warmup Endpoint
 * GET /api/srs/warmup?studentId=xxx&subject=MATH&maxItems=20
 * Generates a curated Daily Warmup of review items
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDailyWarmup } from '@/lib/srs';
import type { Subject } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const subject = searchParams.get('subject') as Subject | null;
    const maxItems = searchParams.get('maxItems');

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

    const warmup = await generateDailyWarmup(
      studentId,
      subject || undefined,
      maxItems ? parseInt(maxItems) : 20
    );

    return NextResponse.json(warmup, { status: 200 });
  } catch (error) {
    console.error('Error generating daily warmup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
