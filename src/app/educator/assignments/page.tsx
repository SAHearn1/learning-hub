import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { EducatorAssignmentsClient } from './educator-assignments-client';

export const dynamic = 'force-dynamic';

const EDUCATOR_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function EducatorAssignmentsPage() {
  const user = await requireUser();

  if (!EDUCATOR_ROLES.includes(user.role)) {
    redirect('/');
  }

  return <EducatorAssignmentsClient />;
}
