/**
 * SRS Review Submission Endpoint
 * POST /api/srs/review
 * Body: {
 *   scheduleId: string,
 *   rating: 1 | 2 | 3 | 4, // AGAIN, HARD, GOOD, EASY
 *   responseTime?: number
 * }
 * Submits a review response and updates schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitReview } from '@/lib/srs';
import { ReviewRating } from '@/lib/srs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, rating, responseTime } = body;

    if (!scheduleId || !rating) {
      return NextResponse.json(
        { error: 'Missing required parameters: scheduleId and rating' },
        { status: 400 }
      );
    }

    if (![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating. Must be 1 (AGAIN), 2 (HARD), 3 (GOOD), or 4 (EASY)' },
        { status: 400 }
      );
    }

    await submitReview(
      scheduleId,
      rating as ReviewRating,
      responseTime
    );

    return NextResponse.json(
      { message: 'Review submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting review:', error);

    if (error instanceof Error && error.message === 'Schedule not found') {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
