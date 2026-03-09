import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/page-auth';
import { StudentsClient } from './students-client';

export const dynamic = 'force-dynamic';

export default async function EducatorStudentsPage() {
  const user = await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const students = await db.student.findMany({
    where: { user: { tenantId: user.tenantId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      iepAccommodations: { where: { active: true } },
      _count: { select: { sessions: true, progress: true } },
      enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
    },
    orderBy: { user: { lastName: 'asc' } },
    take: 50,
  });

  const studentRows = students.map((s) => ({
    id: s.id,
    gradeLevel: s.gradeLevel,
    user: s.user,
    iepAccommodations: s.iepAccommodations.map((acc) => ({
      id: acc.id,
      type: acc.type as import('./students-client').AccommodationType,
      description: acc.description,
      active: acc.active,
      startDate: acc.startDate.toISOString(),
      endDate: acc.endDate ? acc.endDate.toISOString() : null,
    })),
    _count: s._count,
    enrollmentCount: s.enrollments.length,
  }));

  return <StudentsClient students={studentRows} />;
}
