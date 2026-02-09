const plans = [
  { label: 'Starter', tier: 'STARTER' },
  { label: 'Professional', tier: 'PROFESSIONAL' },
  { label: 'Enterprise', tier: 'ENTERPRISE' },
] as const;

const accessibilityOptions = [
  {
    id: 'high-contrast',
    label: 'High Contrast Mode',
    description: 'Increase contrast between text and background for improved readability.',
  },
  {
    id: 'large-text',
    label: 'Large Text',
    description: 'Increase base font size across the platform for easier reading.',
  },
  {
    id: 'reduce-motion',
    label: 'Reduce Motion',
    description: 'Minimize animations and transitions throughout the interface.',
  },
  {
    id: 'screen-reader',
    label: 'Screen Reader Optimized',
    description: 'Optimize layout and navigation for assistive technology compatibility.',
  },
] as const;

const notificationPreferences = [
  {
    id: 'session-reminders',
    label: 'Session Reminders',
    description: 'Receive reminders before scheduled garden sessions and lessons.',
  },
  {
    id: 'progress-updates',
    label: 'Progress Updates',
    description: 'Weekly summary of student growth, completed activities, and milestones.',
  },
  {
    id: 'community-activity',
    label: 'Community Activity',
    description: 'Notifications when Garden Circle members post or respond to discussions.',
  },
  {
    id: 'pd-announcements',
    label: 'PD Announcements',
    description: 'Professional development opportunities, workshop schedules, and deadlines.',
  },
] as const;

const tutorPersonalities = [
  {
    value: 'encouraging',
    label: 'Encouraging',
    description: 'Warm, affirming tone focused on celebrating effort and growth.',
  },
  {
    value: 'curious',
    label: 'Curious',
    description: 'Wonder-driven tone that models questioning and exploration.',
  },
  {
    value: 'direct',
    label: 'Direct',
    description: 'Clear, concise responses with minimal scaffolding for independent learners.',
  },
  {
    value: 'playful',
    label: 'Playful',
    description: 'Light-hearted tone using garden humor and creative metaphors.',
  },
] as const;

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-3 text-neutral-700">
        Manage your profile, preferences, accessibility options, and subscription details.
      </p>

      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Profile</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Your personal information and role within the RootWork platform.
        </p>
        <form className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="you@example.com"
                disabled
              />
              <p className="mt-1 text-xs text-neutral-400">Email is managed through your authentication provider.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-neutral-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              >
                <option value="educator">Educator</option>
                <option value="administrator">Administrator</option>
                <option value="parent">Parent / Guardian</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label htmlFor="gradeBand" className="block text-sm font-medium text-neutral-700">
                Primary Grade Band
              </label>
              <select
                id="gradeBand"
                name="gradeBand"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              >
                <option value="">Select grade band</option>
                <option value="k-2">K-2</option>
                <option value="3-5">3-5</option>
                <option value="6-8">6-8</option>
                <option value="9-12">9-12</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-neutral-700">
              School / Organization
            </label>
            <input
              type="text"
              id="school"
              name="school"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              placeholder="School or organization name"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Save Profile
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Accessibility</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Customize the platform experience to meet your accessibility needs. Changes apply
          immediately across all pages.
        </p>
        <div className="mt-6 space-y-4">
          {accessibilityOptions.map((option) => (
            <div key={option.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={option.id}
                name={option.id}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              <label htmlFor={option.id} className="flex-1">
                <span className="block text-sm font-medium text-neutral-900">{option.label}</span>
                <span className="block text-xs text-neutral-500">{option.description}</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Notifications</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Choose which notifications you receive. All notifications can also be managed from the
          notification center.
        </p>
        <div className="mt-6 space-y-4">
          {notificationPreferences.map((pref) => (
            <div key={pref.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={pref.id}
                name={pref.id}
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              <label htmlFor={pref.id} className="flex-1">
                <span className="block text-sm font-medium text-neutral-900">{pref.label}</span>
                <span className="block text-xs text-neutral-500">{pref.description}</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">RootGuide Tutor Preferences</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Customize how the RootGuide AI tutor interacts with you or your students. These settings
          shape the conversational style and scaffolding approach.
        </p>
        <div className="mt-6">
          <p className="text-sm font-medium text-neutral-700">Tutor Personality</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {tutorPersonalities.map((personality) => (
              <label
                key={personality.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <input
                  type="radio"
                  name="tutorPersonality"
                  value={personality.value}
                  className="mt-1 h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                />
                <div className="flex-1">
                  <span className="block text-sm font-medium text-neutral-900">{personality.label}</span>
                  <span className="block text-xs text-neutral-500">{personality.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="scaffoldingLevel" className="block text-sm font-medium text-neutral-700">
              Scaffolding Level
            </label>
            <select
              id="scaffoldingLevel"
              name="scaffoldingLevel"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="high">High (more hints, guided steps)</option>
              <option value="medium">Medium (balanced support)</option>
              <option value="low">Low (minimal hints, independent)</option>
            </select>
          </div>
          <div>
            <label htmlFor="responseLength" className="block text-sm font-medium text-neutral-700">
              Response Length
            </label>
            <select
              id="responseLength"
              name="responseLength"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="concise">Concise</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Save Tutor Preferences
        </button>
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
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

      <section className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-6">
        <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-700">
          These actions are permanent and cannot be undone. Proceed with caution.
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Export All Data</p>
              <p className="text-xs text-neutral-500">Download all your data including progress, journals, and portfolio artifacts.</p>
            </div>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Export
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4">
            <div>
              <p className="text-sm font-medium text-red-900">Delete Account</p>
              <p className="text-xs text-neutral-500">Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <button
              type="button"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
