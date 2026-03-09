import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurrentSchoolYear } from '@/lib/safeguards/school-year';

export const GET = withApiHandler(async () => {
  const user = await requireRole(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const tenantId = user.tenantId;
  const schoolYear = getCurrentSchoolYear();

  const [evalCases, discCases, goals] = await Promise.all([
    db.evaluationCase.findMany({ where: { tenantId }, take: 10000 }),
    db.disciplineCase.findMany({ where: { tenantId }, take: 10000 }),
    db.iepGoal.findMany({ where: { tenantId }, take: 10000 }),
  ]);

  // Indicator 11: Timely Initial Evaluation
  const initialEvals = evalCases.filter(c => c.caseType === 'INITIAL');
  const timelyEvals = initialEvals.filter(c => {
    if (!c.evaluationDueDate || !c.eligibilityDate) return false;
    return c.eligibilityDate <= c.evaluationDueDate;
  });
  const indicator11Rate = initialEvals.length > 0
    ? Math.round((timelyEvals.length / initialEvals.length) * 100)
    : 100;

  // Discipline: Suspension/Expulsion Rates
  const totalStudents = await db.student.count({ where: { user: { tenantId } } });
  const studentsWithRemovals = new Set(discCases.map(d => d.studentId)).size;
  const suspensionRate = totalStudents > 0
    ? Math.round((studentsWithRemovals / totalStudents) * 100 * 10) / 10
    : 0;

  const copCases = discCases.filter(d => d.isChangeOfPlacement);

  // IEP Goals: Active with measurement
  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const goalsWithMethod = activeGoals.filter(g => g.measurementMethod !== null);
  const goalComplianceRate = activeGoals.length > 0
    ? Math.round((goalsWithMethod.length / activeGoals.length) * 100)
    : 100;

  let csv = `SPP/APR State Report — ${schoolYear}\nTenant: ${tenantId}\nGenerated: ${new Date().toISOString()}\n\n`;
  csv += 'Indicator,Metric,Value\n';
  csv += `11,Initial Evaluations (Total),${initialEvals.length}\n`;
  csv += `11,Timely Evaluations,${timelyEvals.length}\n`;
  csv += `11,Timely Rate (%),${indicator11Rate}\n`;
  csv += `Discipline,Total Students,${totalStudents}\n`;
  csv += `Discipline,Students with Removals,${studentsWithRemovals}\n`;
  csv += `Discipline,Suspension Rate (%),${suspensionRate}\n`;
  csv += `Discipline,Change of Placement Cases,${copCases.length}\n`;
  csv += `IEP Goals,Active Goals,${activeGoals.length}\n`;
  csv += `IEP Goals,With Measurement Method,${goalsWithMethod.length}\n`;
  csv += `IEP Goals,Goal Compliance Rate (%),${goalComplianceRate}\n`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="spp-apr-report-${schoolYear}.csv"`,
    },
  });
});
