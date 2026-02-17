import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ParentGradesClient } from './parent-grades-client';

export const dynamic = 'force-dynamic';

export default async function ParentGradesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  if (user.role !== 'PARENT') {
    redirect('/');
  }

  return <ParentGradesClient />;
}
