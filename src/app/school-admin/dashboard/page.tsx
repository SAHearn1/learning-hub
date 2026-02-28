import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function SchoolAdminDashboardPage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenantId = user.tenantId;

  const [classCount, educatorCount, studentCount, consentGrantedCount] = await Promise.all([
    db.class.count({ where: { tenantId } }),
    db.user.count({ where: { tenantId, role: 'EDUCATOR' } }),
    db.user.count({ where: { tenantId, role: 'STUDENT' } }),
    db.user.count({ where: { tenantId, role: 'STUDENT', consentStatus: 'GRANTED' } }),
  ]);

  const complianceRate =
    studentCount > 0 ? Math.round((consentGrantedCount / studentCount) * 100) : 100;

  const statCards = [
    { label: 'Total Classes', value: classCount, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Educators', value: educatorCount, color: 'text-violet-700', bg: 'bg-violet-50' },
    { label: 'Students', value: studentCount, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Compliance Rate', value: `${complianceRate}%`, color: 'text-amber-700', bg: 'bg-amber-50' },
  ];

  const navCards = [
    {
      href: '/school-admin/classes',
      title: 'Classes',
      description: 'View and manage all classes, subjects, and grade levels in your school.',
      icon: '📚',
    },
    {
      href: '/school-admin/educators',
      title: 'Educators',
      description: 'Manage educator assignments, credentials, and teaching loads.',
      icon: '👩‍🏫',
    },
    {
      href: '/school-admin/students',
      title: 'Students',
      description: 'School-wide student roster, enrollment, and progress overview.',
      icon: '🎒',
    },
    {
      href: '/school-admin/compliance',
      title: 'Compliance',
      description: 'IEP accommodations, parental consent rates, and audit summaries.',
      icon: '✅',
    },
    {
      href: '/school-admin/billing',
      title: 'Billing',
      description: 'Subscription management, tier details, and invoicing.',
      icon: '💳',
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">School Admin Dashboard</h1>
        <p className="mt-2 text-neutral-600">
          Welcome back, {user.firstName}. Manage classes, educators, and students within your school.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Manage</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{card.icon}</span>
                <h3 className="font-semibold text-neutral-900">{card.title}</h3>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
