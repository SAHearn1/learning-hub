/**
 * IRT Calibration Endpoint
 * POST /api/irt/calibrate
 * Body: { subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY', minResponses?: number }
 * Calibrates all items and updates student abilities for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { calibrateAllItems, batchUpdateStudentAbilities } from '@/lib/irt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, minResponses = 30 } = body;

    if (!subject) {
      return NextResponse.json(
        { error: 'Missing required parameter: subject' },
        { status: 400 }
      );
    }

    if (!['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'].includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject. Must be MATH, SCIENCE, or LANGUAGE_ARTS' },
        { status: 400 }
      );
    }

    // Calibrate items
    const calibrationResults = await calibrateAllItems(subject, minResponses);

    // Update student abilities
    const studentsUpdated = await batchUpdateStudentAbilities(subject);

    return NextResponse.json(
      {
        message: 'Calibration completed successfully',
        itemsCalibrated: calibrationResults.calibrated,
        itemsSkipped: calibrationResults.skipped,
        studentsUpdated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during calibration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
