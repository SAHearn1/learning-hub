/**
 * IRT Student Ability Endpoint
 * GET /api/irt/ability?studentId=xxx&subject=MATH
 * Returns student's current ability estimate (theta) for a subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentAbility } from '@/lib/irt';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasRequiredMinorConsent } from '@/lib/compliance';

export async function GET(request: NextRequest) {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    return NextResponse.json({ error: 'Parental consent required before ability access' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const studentId = searchParams.get('studentId');
  const subject = searchParams.get('subject') as 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';

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
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (user.role === 'STUDENT' && student.user.id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (user.role !== 'STUDENT' && student.user.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ability = await getStudentAbility(studentId, subject);

  if (!ability) {
    return NextResponse.json({
      message: 'No ability estimate available yet',
      theta: 0,
      standardError: 1,
      confidenceIntervalLower: -2,
      confidenceIntervalUpper: 2,
      reliabilityIndex: 0,
    });
  }

  return NextResponse.json(ability);
}
