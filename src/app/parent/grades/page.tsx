import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ParentGradesClient } from './parent-grades-client';

export const dynamic = 'force-dynamic';

export default async function ParentGradesPage() {
  const user = await requireUser();

  if (user.role !== 'PARENT') {
    redirect('/');
  }

  return <ParentGradesClient />;
}
