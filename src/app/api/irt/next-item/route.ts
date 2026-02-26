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
import { NotFoundError, ForbiddenError, BadRequestError } from '@/lib/api-errors';
import { selectNextItem, getStudentAbility } from '@/lib/irt';
import type { Subject, BloomsLevel } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { withApiHandler } from '@/lib/api-handler';

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before adaptive item selection');
  }

  const body = await req.json();
  const {
    studentId,
    subject,
    currentTheta,
    excludeAssessmentIds,
    bloomsLevelDistribution,
  } = body;

  if (!studentId || !subject) {
    throw new BadRequestError('Missing required parameters: studentId and subject');
  }

  if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
    throw new BadRequestError(
      'Invalid subject. Must be MATH, SCIENCE, LANGUAGE_ARTS, or FINANCIAL_LITERACY'
    );
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  if (user.role === 'STUDENT' && student.user.id !== user.id) {
    throw new ForbiddenError('Forbidden');
  }

  if (user.role !== 'STUDENT' && student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError('Forbidden');
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
    throw new NotFoundError(
      'No suitable items found. Please calibrate more items or expand item pool'
    );
  }

  return NextResponse.json(selectedItem);
});
