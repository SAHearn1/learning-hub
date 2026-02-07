const plans = [
  { label: 'Starter', tier: 'STARTER' },
  { label: 'Professional', tier: 'PROFESSIONAL' },
  { label: 'Enterprise', tier: 'ENTERPRISE' },
] as const;

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-3 text-neutral-700">
        Profile, preferences, and accessibility controls will be expanded here during account integration.
      </p>

      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Billing</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Manage your subscription in Stripe and start a checkout session for plan upgrades.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/billing/portal"
            className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Open billing portal
          </a>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-neutral-700">Upgrade subscription</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plans.map((plan) => (
              <form key={plan.tier} method="post" action="/api/billing/checkout" className="inline-flex">
                <input type="hidden" name="tier" value={plan.tier} />
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Checkout {plan.label}
                </button>
              </form>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Checkout buttons require Stripe price IDs and authenticated tenant context.
          </p>
        </div>
      </section>
    </main>
  );
}
