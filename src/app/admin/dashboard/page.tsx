import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard';
import { requirePageUser } from '@/lib/page-auth';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminDashboardPage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const user = await getCurrentUser();
  const role = user?.role;

  if (role === 'DISTRICT_ADMIN') {
    return (
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <h1 className="text-3xl font-bold text-neutral-900">District Admin Dashboard</h1>
        <p className="mt-2 text-neutral-700">
          Manage schools, educators, and compliance across your district.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Schools</h2>
            <p className="mt-1 text-sm text-neutral-600">View and manage schools in your district.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Educators</h2>
            <p className="mt-1 text-sm text-neutral-600">District-wide educator management.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Compliance</h2>
            <p className="mt-1 text-sm text-neutral-600">District compliance and reporting.</p>
          </div>
        </div>
      </main>
    );
  }

  return <SuperAdminDashboard />;
}
