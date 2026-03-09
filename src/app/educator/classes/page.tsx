import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/page-auth';
import { ClassesClient } from './classes-client';

export const dynamic = 'force-dynamic';

export default async function EducatorClassesPage() {
  const user = await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const where =
    user.role === 'EDUCATOR' ? { educatorId: user.id } : { tenantId: user.tenantId };

  const [classes, students, schools] = await Promise.all([
    db.class.findMany({
      where,
      include: {
        school: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.student.findMany({
      where: { user: { tenantId: user.tenantId } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { lastName: 'asc' } },
      take: 100,
    }),
    db.school.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const classRows = classes.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    gradeLevel: c.gradeLevel,
    academicYear: c.academicYear,
    school: c.school,
    _count: c._count,
  }));

  const studentOptions = students.map((s) => ({
    id: s.id,
    firstName: s.user.firstName,
    lastName: s.user.lastName,
  }));

  return <ClassesClient classes={classRows} students={studentOptions} schools={schools} />;
}
