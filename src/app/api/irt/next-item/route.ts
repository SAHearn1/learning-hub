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
import { selectNextItem, getStudentAbility } from '@/lib/irt';
import type { Subject, BloomsLevel } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
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

    if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          message: 'No suitable items found',
          recommendation: 'Please calibrate more items or expand item pool',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(selectedItem, { status: 200 });
  } catch (error) {
    console.error('Error selecting next item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
