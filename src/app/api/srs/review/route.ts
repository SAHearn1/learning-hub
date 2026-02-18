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
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError, NotFoundError } from '@/lib/api-errors';
import { submitReview } from '@/lib/srs';
import { ReviewRating } from '@/lib/srs';

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { scheduleId, rating, responseTime } = body;

  if (!scheduleId || !rating) {
    throw new ValidationError('Missing required parameters: scheduleId and rating');
  }

  if (![1, 2, 3, 4].includes(rating)) {
    throw new ValidationError('Invalid rating. Must be 1 (AGAIN), 2 (HARD), 3 (GOOD), or 4 (EASY)');
  }

  try {
    await submitReview(
      scheduleId,
      rating as ReviewRating,
      responseTime
    );

    return NextResponse.json({ message: 'Review submitted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Schedule not found') {
      throw new NotFoundError('Schedule not found');
    }
    throw error;
  }
});
