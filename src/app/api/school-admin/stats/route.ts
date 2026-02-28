import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/api-errors';

export const GET = withApiHandler(async () => {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  if (!['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only school administrators can view school stats');
  }

  const tenantId = user.tenantId;

  const [classCount, educatorCount, studentCount, iepStudentCount, consentGrantedCount, totalStudentCount] =
    await Promise.all([
      db.class.count({ where: { tenantId } }),
      db.user.count({ where: { tenantId, role: 'EDUCATOR' } }),
      db.user.count({ where: { tenantId, role: 'STUDENT' } }),
      db.student.count({
        where: {
          user: { tenantId },
          iepAccommodations: { some: { active: true } },
        },
      }),
      db.user.count({
        where: {
          tenantId,
          role: 'STUDENT',
          consentStatus: 'GRANTED',
        },
      }),
      db.user.count({ where: { tenantId, role: 'STUDENT' } }),
    ]);

  const complianceRate =
    totalStudentCount > 0
      ? Math.round((consentGrantedCount / totalStudentCount) * 100)
      : 100;

  return NextResponse.json({
    classCount,
    educatorCount,
    studentCount,
    iepStudentCount,
    complianceRate,
    consentGrantedCount,
  });
});
