import { requirePageUser } from '@/lib/page-auth';

export default async function SchoolAdminDashboardPage() {
  await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">School Admin Dashboard</h1>
      <p className="mt-2 text-neutral-700">
        Manage classes, educators, and students within your school.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Classes</h2>
          <p className="mt-1 text-sm text-neutral-600">View and manage all classes in your school.</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Educators</h2>
          <p className="mt-1 text-sm text-neutral-600">Manage educator assignments and credentials.</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Students</h2>
          <p className="mt-1 text-sm text-neutral-600">School-wide student roster and enrollment.</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Compliance</h2>
          <p className="mt-1 text-sm text-neutral-600">School compliance dashboard and reports.</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Billing</h2>
          <p className="mt-1 text-sm text-neutral-600">Subscription management and invoicing.</p>
        </div>
      </div>
    </main>
  );
}
