import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard';

export default async function AdminDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <SuperAdminDashboard />;
}
