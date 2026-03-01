import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const user = await requireRole([
    'EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN',
  ]);
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const format = url.searchParams.get('format') ?? 'csv';
  const tenantId = user.tenantId;

  if (format !== 'csv') {
    return NextResponse.json({ error: 'Only CSV export is currently supported' }, { status: 400 });
  }

  let csv = '';
  let filename = 'export.csv';

  switch (type) {
    case 'grades': {
      const grades = await db.grade.findMany({
        where: { submission: { assignment: { class: { tenantId } } } },
        include: {
          submission: {
            include: {
              assignment: { select: { title: true, type: true } },
              student: { select: { id: true } },
            },
          },
        },
        orderBy: { gradedAt: 'desc' },
        take: 5000,
      });
      csv = 'Student ID,Assignment,Type,Score,Max Score,Percentage,Letter Grade,Graded At\n';
      csv += grades.map(g =>
        `${g.submission.student?.id},${g.submission.assignment.title.replace(/,/g, ';')},${g.submission.assignment.type},${g.score},${g.maxScore},${g.percentage},${g.letterGrade ?? ''},${g.gradedAt.toISOString()}`
      ).join('\n');
      filename = 'grades-export.csv';
      break;
    }

    case 'audit-log': {
      const logs = await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        take: 5000,
      });
      csv = 'Timestamp,User ID,Action,Resource,Resource ID,Chain Hash\n';
      csv += logs.map(l =>
        `${l.timestamp.toISOString()},${l.userId},${l.action},${l.resource},${l.resourceId ?? ''},${l.chainHash}`
      ).join('\n');
      filename = 'audit-log-export.csv';
      break;
    }

    case 'compliance': {
      const [evalCases, goals, discCases] = await Promise.all([
        db.evaluationCase.findMany({ where: { tenantId }, take: 5000 }),
        db.iepGoal.findMany({ where: { tenantId }, take: 5000 }),
        db.disciplineCase.findMany({ where: { tenantId }, take: 5000 }),
      ]);
      csv = 'Type,ID,Student ID,State,Created At\n';
      csv += evalCases.map(c => `Evaluation,${c.id},${c.studentId},${c.currentState},${c.createdAt.toISOString()}`).join('\n');
      csv += '\n' + goals.map(g => `IEP Goal,${g.id},${g.studentId},${g.status},${g.createdAt.toISOString()}`).join('\n');
      csv += '\n' + discCases.map(d => `Discipline,${d.id},${d.studentId},${d.currentState},${d.createdAt.toISOString()}`).join('\n');
      filename = 'compliance-export.csv';
      break;
    }

    default:
      return NextResponse.json({ error: 'Invalid export type. Use: grades, audit-log, compliance' }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
