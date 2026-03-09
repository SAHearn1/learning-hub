import { requirePageUser } from '@/lib/page-auth';
import { ParentGradesClient } from './parent-grades-client';

export const dynamic = 'force-dynamic';

export default async function ParentGradesPage() {
  await requirePageUser(['PARENT']);

  return <ParentGradesClient />;
}
