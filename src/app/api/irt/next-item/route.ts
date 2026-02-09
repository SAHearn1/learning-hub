/**
 * IRT Adaptive Item Selection Endpoint
 * POST /api/irt/next-item
 * Body: {
 *   studentId: string,
 *   subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS',
 *   currentTheta?: number,
 *   excludeAssessmentIds?: string[],
 *   bloomsLevelDistribution?: Record<BloomsLevel, number>
 * }
 * Returns the next best item to administer based on student ability
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError, NotFoundError } from '@/lib/api-errors';
import { selectNextItem, getStudentAbility } from '@/lib/irt';
import type { Subject, BloomsLevel } from '@prisma/client';

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const {
    studentId,
    subject,
    currentTheta,
    excludeAssessmentIds,
    bloomsLevelDistribution,
  } = body;

  if (!studentId || !subject) {
    throw new ValidationError('Missing required parameters: studentId and subject');
  }

  if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS'].includes(subject)) {
    throw new ValidationError('Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS');
  }

  // Get student's current theta if not provided
  let theta = currentTheta;
  if (theta === undefined) {
    const ability = await getStudentAbility(studentId, subject as Subject);
    theta = ability?.theta ?? 0;
  }

  // Select next item
  const selectedItem = await selectNextItem({
    studentId,
    subject: subject as Subject,
    currentTheta: theta,
    excludeAssessmentIds,
    bloomsLevelDistribution: bloomsLevelDistribution as Partial<Record<BloomsLevel, number>>,
  });

  if (!selectedItem) {
    throw new NotFoundError('No suitable items found. Please calibrate more items or expand item pool');
  }

  return NextResponse.json(selectedItem);
});
