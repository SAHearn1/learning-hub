import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkComplianceForGoal } from '@/lib/progress-monitoring/progress-monitoring.service';

export const GET = withApiHandler(async (req) => {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId query param required' }, { status: 400 });
  }

  const goals = await db.iepGoal.findMany({
    where: { tenantId: user.tenantId, studentId, status: 'ACTIVE' },
  });

  const results = await Promise.all(
    goals.map((g) => checkComplianceForGoal(g.id)),
  );

  const overallPassed = results.every((r) => r.passed);

  return NextResponse.json({
    data: {
      studentId,
      passed: overallPassed,
      goalCount: goals.length,
      results,
    },
  });
});
