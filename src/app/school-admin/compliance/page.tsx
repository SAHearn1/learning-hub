import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export default async function SchoolAdminCompliancePage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenantId = user.tenantId;

  const [
    totalStudents,
    consentGrantedCount,
    consentPendingCount,
    consentDeniedCount,
    iepStudentCount,
    activeIepAccommodationCount,
  ] = await Promise.all([
    db.user.count({ where: { tenantId, role: 'STUDENT' } }),
    db.user.count({ where: { tenantId, role: 'STUDENT', consentStatus: 'GRANTED' } }),
    db.user.count({ where: { tenantId, role: 'STUDENT', consentStatus: 'PENDING' } }),
    db.user.count({
      where: {
        tenantId,
        role: 'STUDENT',
        consentStatus: { in: ['DENIED', 'WITHDRAWN'] },
      },
    }),
    db.student.count({
      where: {
        user: { tenantId },
        iepAccommodations: { some: { active: true } },
      },
    }),
    db.iepAccommodation.count({
      where: {
        active: true,
        student: { user: { tenantId } },
      },
    }),
  ]);

  const consentRate =
    totalStudents > 0 ? Math.round((consentGrantedCount / totalStudents) * 100) : 100;

  const complianceCards = [
    {
      title: 'Parental Consent Rate',
      value: `${consentRate}%`,
      sub: `${consentGrantedCount} of ${totalStudents} students`,
      color: consentRate >= 90 ? 'text-emerald-700' : consentRate >= 70 ? 'text-amber-700' : 'text-red-700',
      bg: consentRate >= 90 ? 'bg-emerald-50' : consentRate >= 70 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      title: 'Consent Pending',
      value: consentPendingCount,
      sub: 'students awaiting consent',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      title: 'Consent Denied / Withdrawn',
      value: consentDeniedCount,
      sub: 'students without consent',
      color: 'text-red-700',
      bg: 'bg-red-50',
    },
    {
      title: 'Students with IEP',
      value: iepStudentCount,
      sub: `${activeIepAccommodationCount} active accommodations`,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Compliance Overview</h1>
          <p className="mt-2 text-neutral-600">
            Monitor IEP accommodations, parental consent, and regulatory compliance.
          </p>
        </div>
        <Link
          href="/school-admin/dashboard"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {complianceCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-neutral-500">{card.title}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Action links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">IEP Management</h2>
          <p className="mt-1 text-sm text-neutral-600">
            IEP accommodations are managed per-student through the educator portal. Educators can
            view and activate accommodations for students in their classes.
          </p>
          <Link
            href="/educator/students"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Go to Educator Portal
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Data Retention</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Review data retention policies, process deletion requests, and manage FERPA / GDPR data
            subject rights across your tenant.
          </p>
          <Link
            href="/admin/data-retention"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Data Retention Admin
          </Link>
        </div>
      </div>

      {/* Consent breakdown */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-neutral-900">Consent Breakdown</h2>
        <div className="space-y-3">
          {[
            {
              label: 'Consent Granted',
              count: consentGrantedCount,
              total: totalStudents,
              color: 'bg-emerald-500',
            },
            {
              label: 'Consent Pending',
              count: consentPendingCount,
              total: totalStudents,
              color: 'bg-amber-400',
            },
            {
              label: 'Denied / Withdrawn',
              count: consentDeniedCount,
              total: totalStudents,
              color: 'bg-red-400',
            },
          ].map((row) => {
            const pct = totalStudents > 0 ? Math.round((row.count / totalStudents) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{row.label}</span>
                  <span className="font-medium text-neutral-900">
                    {row.count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-2 rounded-full ${row.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
