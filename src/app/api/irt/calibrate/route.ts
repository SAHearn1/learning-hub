/**
 * IRT Calibration Endpoint
 * POST /api/irt/calibrate
 * Body: { subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY', minResponses?: number }
 * Calibrates all items and updates student abilities for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/api-errors';
import { requireRole } from '@/lib/auth';
import { calibrateAllItems, batchUpdateStudentAbilities } from '@/lib/irt';

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireRole(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const body = await req.json();
  const { subject, minResponses = 30 } = body;

  if (!subject) {
    throw new ValidationError('Missing required parameter: subject');
  }

  if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
    throw new ValidationError(
      'Invalid subject. Must be MATH, SCIENCE, LANGUAGE_ARTS, or FINANCIAL_LITERACY'
    );
  }

  // Calibrate items
  const calibrationResults = await calibrateAllItems(subject, minResponses);

  // Update student abilities
  const studentsUpdated = await batchUpdateStudentAbilities(subject);

  return NextResponse.json({
    message: 'Calibration completed successfully',
    itemsCalibrated: calibrationResults.calibrated,
    itemsSkipped: calibrationResults.skipped,
    studentsUpdated,
  });
});
