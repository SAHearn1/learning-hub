import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard';
import { requirePageUser } from '@/lib/page-auth';

export default async function AdminDashboardPage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  return <SuperAdminDashboard />;
}
