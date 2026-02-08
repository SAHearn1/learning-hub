'use client';

import { useLearnerStore } from '@/stores/learner-store';
import { useUIStore } from '@/stores/ui-store';

const plans = [
  { label: 'Starter', tier: 'STARTER' },
  { label: 'Professional', tier: 'PROFESSIONAL' },
  { label: 'Enterprise', tier: 'ENTERPRISE' },
] as const;

const GRADE_OPTIONS = [
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 7, label: 'Grade 7' },
  { value: 8, label: 'Grade 8' },
  { value: 9, label: 'Grade 9' },
  { value: 10, label: 'Grade 10' },
  { value: 11, label: 'Grade 11' },
  { value: 12, label: 'Grade 12' },
];

const MODALITY_OPTIONS: { value: 'visual' | 'auditory' | 'kinesthetic' | 'reading'; label: string }[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'auditory', label: 'Auditory' },
  { value: 'kinesthetic', label: 'Kinesthetic' },
  { value: 'reading', label: 'Reading/Writing' },
];

const PACING_OPTIONS: { value: 'slow' | 'moderate' | 'fast'; label: string; description: string }[] = [
  { value: 'slow', label: 'Relaxed', description: 'Take more time with each concept' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced pace' },
  { value: 'fast', label: 'Quick', description: 'Move through material faster' },
];

const SCAFFOLDING_OPTIONS: { value: 'high' | 'medium' | 'low'; label: string; description: string }[] = [
  { value: 'high', label: 'More Support', description: 'More hints and step-by-step guidance' },
  { value: 'medium', label: 'Balanced', description: 'Standard level of guidance' },
  { value: 'low', label: 'Independent', description: 'Minimal hints, more self-directed' },
];

export default function SettingsPage() {
  const gradeLevel = useLearnerStore((s) => s.gradeLevel);
  const preferences = useLearnerStore((s) => s.preferences);
  const updatePreferences = useLearnerStore((s) => s.updatePreferences);
  const setStudent = useLearnerStore((s) => s.setStudent);
  const studentId = useLearnerStore((s) => s.studentId);

  const theme = useUIStore((s) => s.theme);
  const fontSize = useUIStore((s) => s.fontSize);
  const dyslexicFont = useUIStore((s) => s.dyslexicFont);
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const setTheme = useUIStore((s) => s.setTheme);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const toggleDyslexicFont = useUIStore((s) => s.toggleDyslexicFont);
  const toggleReducedMotion = useUIStore((s) => s.toggleReducedMotion);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStudent(studentId ?? '', parseInt(e.target.value, 10));
  };

  const toggleModality = (mod: 'visual' | 'auditory' | 'kinesthetic' | 'reading') => {
    const current = preferences.modalities;
    const next = current.includes(mod)
      ? current.filter((m) => m !== mod)
      : [...current, mod];
    if (next.length > 0) {
      updatePreferences({ modalities: next });
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-2 text-neutral-600">
          Manage your learning preferences, accessibility, and account.
        </p>
      </div>

      {/* Learning Profile */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Learning Profile</h2>
        <p className="mt-1 text-sm text-neutral-600">
          These settings help RootGuide personalize your learning experience.
        </p>

        <div className="mt-6 space-y-6">
          {/* Grade Level */}
          <div>
            <label htmlFor="grade-level" className="block text-sm font-medium text-neutral-700">
              Grade Level
            </label>
            <select
              id="grade-level"
              value={gradeLevel}
              onChange={handleGradeChange}
              className="mt-1 w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {GRADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Learning Modalities */}
          <div>
            <span className="block text-sm font-medium text-neutral-700">
              Preferred Learning Styles
            </span>
            <p className="mt-0.5 text-xs text-neutral-500">Select all that apply.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MODALITY_OPTIONS.map((mod) => {
                const isSelected = preferences.modalities.includes(mod.value);
                return (
                  <button
                    key={mod.value}
                    onClick={() => toggleModality(mod.value)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {mod.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pacing */}
          <div>
            <span className="block text-sm font-medium text-neutral-700">Pacing</span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PACING_OPTIONS.map((opt) => {
                const isSelected = preferences.pacing === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updatePreferences({ pacing: opt.value })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-neutral-700'}`}>
                      {opt.label}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scaffolding */}
          <div>
            <span className="block text-sm font-medium text-neutral-700">Support Level</span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SCAFFOLDING_OPTIONS.map((opt) => {
                const isSelected = preferences.scaffoldingLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updatePreferences({ scaffoldingLevel: opt.value })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-neutral-700'}`}>
                      {opt.label}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Accessibility</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Adjust the display to make learning more comfortable.
        </p>

        <div className="mt-6 space-y-5">
          {/* Theme */}
          <div>
            <span className="block text-sm font-medium text-neutral-700">Display Theme</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {([
                { value: 'default', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'high-contrast', label: 'High Contrast' },
              ] as const).map((opt) => {
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <span className="block text-sm font-medium text-neutral-700">Text Size</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {([
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ] as const).map((opt) => {
                const isSelected = fontSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle: Dyslexic Font */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-neutral-700">Dyslexia-Friendly Font</span>
              <p className="text-xs text-neutral-500">Use OpenDyslexic for easier reading.</p>
            </div>
            <button
              onClick={toggleDyslexicFont}
              role="switch"
              aria-checked={dyslexicFont}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                dyslexicFont ? 'bg-primary-500' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  dyslexicFont ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </button>
          </div>

          {/* Toggle: Reduced Motion */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-neutral-700">Reduced Motion</span>
              <p className="text-xs text-neutral-500">Minimize animations and transitions.</p>
            </div>
            <button
              onClick={toggleReducedMotion}
              role="switch"
              aria-checked={reducedMotion}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                reducedMotion ? 'bg-primary-500' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  reducedMotion ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Billing */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Billing</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Manage your subscription and payment methods.
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
