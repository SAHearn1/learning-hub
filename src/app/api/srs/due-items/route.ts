/**
 * SRS Due Items Endpoint
 * GET /api/srs/due-items?studentId=xxx&subject=MATH&limit=20
 * Returns items due for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDueItems } from '@/lib/srs';
import type { Subject } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const subject = searchParams.get('subject') as Subject | null;
    const limit = searchParams.get('limit');

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

    const dueItems = await getDueItems(
      studentId,
      subject || undefined,
      limit ? parseInt(limit) : undefined
    );

    return NextResponse.json(
      {
        count: dueItems.length,
        items: dueItems,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching due items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
