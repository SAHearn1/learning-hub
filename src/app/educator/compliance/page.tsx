import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ComplianceClient } from './compliance-client';

export const dynamic = 'force-dynamic';

const EDUCATOR_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorCompliancePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  if (!EDUCATOR_ROLES.includes(user.role)) {
    redirect('/dashboard');
  }

  const [iepStudents, totalStudentCount] = await Promise.all([
    db.student.findMany({
      where: {
        user: { tenantId: user.tenantId },
        iepAccommodations: { some: { active: true } },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        iepAccommodations: { where: { active: true }, orderBy: { startDate: 'desc' } },
      },
      orderBy: { user: { lastName: 'asc' } },
    }),
    db.student.count({
      where: { user: { tenantId: user.tenantId } },
    }),
  ]);

  const students = iepStudents.map((s) => ({
    id: s.id,
    gradeLevel: s.gradeLevel,
    user: {
      firstName: s.user.firstName,
      lastName: s.user.lastName,
    },
    iepAccommodations: s.iepAccommodations.map((acc) => ({
      id: acc.id,
      type: acc.type as import('./compliance-client').AccommodationType,
      description: acc.description,
      active: acc.active,
      startDate: acc.startDate.toISOString(),
      endDate: acc.endDate ? acc.endDate.toISOString() : null,
    })),
  }));

  return <ComplianceClient students={students} totalStudentCount={totalStudentCount} />;
}
