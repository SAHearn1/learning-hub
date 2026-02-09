/**
 * IRT Adaptive Item Selection Endpoint
 * POST /api/irt/next-item
 * Body: {
 *   studentId: string,
 *   subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY',
 *   currentTheta?: number,
 *   excludeAssessmentIds?: string[],
 *   bloomsLevelDistribution?: Record<BloomsLevel, number>
 * }
 * Returns the next best item to administer based on student ability
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotFoundError } from '@/lib/api-errors';
import { selectNextItem, getStudentAbility } from '@/lib/irt';
import type { Subject, BloomsLevel } from '@prisma/client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    studentId,
    subject,
    currentTheta,
    excludeAssessmentIds,
    bloomsLevelDistribution,
  } = body;

  if (!studentId || !subject) {
    return NextResponse.json(
      { error: 'Missing required parameters: studentId and subject' },
      { status: 400 }
    );
  }

  if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
    return NextResponse.json(
      { error: 'Invalid subject. Must be MATH, SCIENCE, LANGUAGE_ARTS, or FINANCIAL_LITERACY' },
      { status: 400 }
    );
  }

  let theta = currentTheta;
  if (theta === undefined) {
    const ability = await getStudentAbility(studentId, subject as Subject);
    theta = ability?.theta ?? 0;
  }

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
}
