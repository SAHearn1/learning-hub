import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/page-auth';
import { ReportsClient } from './reports-client';

export const dynamic = 'force-dynamic';

export default async function EducatorReportsPage() {
  const user = await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const classWhere =
    user.role === 'EDUCATOR' ? { educatorId: user.id } : { tenantId: user.tenantId };

  const [progressRecords, classes] = await Promise.all([
    db.progress.findMany({
      where: { student: { user: { tenantId: user.tenantId } } },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        standard: { select: { code: true, description: true, subject: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
    db.class.findMany({
      where: classWhere,
      select: { id: true, name: true, subject: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const reports = progressRecords.map((p) => ({
    studentId: p.studentId,
    studentName: `${p.student.user.firstName} ${p.student.user.lastName}`,
    gradeLevel: p.student.gradeLevel,
    standardCode: p.standard.code,
    standardDescription: p.standard.description,
    subject: p.standard.subject,
    masteryLevel: p.masteryLevel * 100, // stored 0–1, display as 0–100
    assessmentCount: p.assessmentCount,
    lastAssessedAt: p.lastAssessedAt ? p.lastAssessedAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
  }));

  const classOptions = classes.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
  }));

  return <ReportsClient reports={reports} classes={classOptions} />;
}
