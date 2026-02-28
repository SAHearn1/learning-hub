import Link from 'next/link';
import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard';
import { requirePageUser } from '@/lib/page-auth';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AdminDashboardPage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const user = await getCurrentUser();
  const role = user?.role;

  if (role === 'DISTRICT_ADMIN' && user) {
    const tenantId = user.tenantId;

    const [schoolCount, educatorCount, studentCount] = await Promise.all([
      db.tenant.count(),
      db.user.count({ where: { tenantId, role: 'EDUCATOR' } }),
      db.user.count({ where: { tenantId, role: 'STUDENT' } }),
    ]);

    return (
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <h1 className="text-3xl font-bold text-neutral-900">District Admin Dashboard</h1>
        <p className="mt-2 text-neutral-700">
          Manage schools, educators, and compliance across your district.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/schools" className="block rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-neutral-300 hover:shadow-md transition">
            <h2 className="font-semibold text-neutral-900">Schools</h2>
            <p className="mt-1 text-sm text-neutral-600">View and manage schools in your district.</p>
            <p className="mt-4 text-3xl font-bold text-neutral-900">{schoolCount}</p>
            <p className="text-xs text-neutral-400">total schools</p>
          </Link>
          <Link href="/admin/educators" className="block rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-neutral-300 hover:shadow-md transition">
            <h2 className="font-semibold text-neutral-900">Educators</h2>
            <p className="mt-1 text-sm text-neutral-600">District-wide educator management.</p>
            <p className="mt-4 text-3xl font-bold text-neutral-900">{educatorCount}</p>
            <p className="text-xs text-neutral-400">educators in your school</p>
          </Link>
          <Link href="/admin/compliance" className="block rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-neutral-300 hover:shadow-md transition">
            <h2 className="font-semibold text-neutral-900">Compliance</h2>
            <p className="mt-1 text-sm text-neutral-600">District compliance and reporting.</p>
            <p className="mt-4 text-3xl font-bold text-neutral-900">{studentCount}</p>
            <p className="text-xs text-neutral-400">students enrolled</p>
          </Link>
        </div>
      </main>
    );
  }

  return <SuperAdminDashboard />;
}
