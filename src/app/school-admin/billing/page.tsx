import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  FREE: 'Basic access with limited AI sessions per month.',
  STARTER: 'Up to 100 active students, core LMS features, and standard support.',
  PROFESSIONAL: 'Unlimited students, advanced analytics, IEP tools, and priority support.',
  ENTERPRISE: 'Custom limits, dedicated support, SSO, and compliance reporting.',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'text-emerald-700 bg-emerald-50' },
  TRIALING: { label: 'Trial', color: 'text-blue-700 bg-blue-50' },
  PAST_DUE: { label: 'Past Due', color: 'text-red-700 bg-red-50' },
  CANCELLED: { label: 'Cancelled', color: 'text-neutral-700 bg-neutral-100' },
};

export default async function SchoolAdminBillingPage() {
  const user = await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      name: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
    },
  });

  const tierLabel = tenant ? (TIER_LABELS[tenant.subscriptionTier] ?? tenant.subscriptionTier) : 'Unknown';
  const tierDesc = tenant ? (TIER_DESCRIPTIONS[tenant.subscriptionTier] ?? '') : '';
  const statusInfo = tenant
    ? (STATUS_LABELS[tenant.subscriptionStatus] ?? { label: tenant.subscriptionStatus, color: 'text-neutral-700 bg-neutral-100' })
    : { label: 'Unknown', color: 'text-neutral-700 bg-neutral-100' };

  const hasStripeCustomer = Boolean(tenant?.stripeCustomerId);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Billing</h1>
          <p className="mt-2 text-neutral-600">
            Manage your subscription, view invoices, and update payment details.
          </p>
        </div>
        <Link
          href="/school-admin/dashboard"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Current subscription */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-neutral-900">Current Subscription</h2>
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <p className="text-sm text-neutral-500">Plan</p>
            <p className="mt-0.5 text-2xl font-bold text-neutral-900">{tierLabel}</p>
            <p className="mt-1 text-sm text-neutral-600">{tierDesc}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Status</p>
            <span
              className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
          {tenant && (
            <div>
              <p className="text-sm text-neutral-500">School</p>
              <p className="mt-0.5 font-medium text-neutral-900">{tenant.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Billing portal */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-neutral-900">Manage Billing</h2>
        <p className="text-sm text-neutral-600">
          Access the Stripe customer portal to update payment methods, download invoices, change
          your plan, or cancel your subscription.
        </p>
        {hasStripeCustomer ? (
          <form action="/api/billing/portal" method="POST" className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
            >
              Open Billing Portal
            </button>
          </form>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              No Stripe customer record found for this school. Contact your platform administrator
              to set up billing.
            </p>
          </div>
        )}
      </div>

      {/* Upgrade prompt for free/starter tiers */}
      {tenant && ['FREE', 'STARTER'].includes(tenant.subscriptionTier) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-semibold text-blue-900">Upgrade your plan</h2>
          <p className="mt-1 text-sm text-blue-800">
            Unlock unlimited students, advanced IEP tools, and priority support by upgrading to
            Professional or Enterprise.
          </p>
          <Link
            href="/api/billing/checkout"
            className="mt-4 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
          >
            View Upgrade Options
          </Link>
        </div>
      )}
    </main>
  );
}
