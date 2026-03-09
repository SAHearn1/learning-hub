import { requirePageUser } from '@/lib/page-auth';
import { EducatorAssignmentsClient } from './educator-assignments-client';

export const dynamic = 'force-dynamic';

export default async function EducatorAssignmentsPage() {
  await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  return <EducatorAssignmentsClient />;
}
