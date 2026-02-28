'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ROLES: { value: 'STUDENT' | 'EDUCATOR' | 'PARENT'; label: string; description: string; Icon: LucideIcon }[] = [
  {
    value: 'STUDENT',
    label: 'Student',
    description: 'I want to learn and explore subjects.',
    Icon: BookOpen,
  },
  {
    value: 'EDUCATOR',
    label: 'Educator',
    description: 'I teach students and manage classes.',
    Icon: GraduationCap,
  },
  {
    value: 'PARENT',
    label: 'Parent / Guardian',
    description: 'I want to monitor my child\'s progress.',
    Icon: Users,
  },
];

export function OnboardingClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState(6);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selected,
          ...(selected === 'STUDENT' ? { gradeLevel } : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Something went wrong.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-neutral-900">Welcome to RootWork</h1>
      <p className="mt-2 text-neutral-600">
        Tell us about yourself so we can personalize your experience.
      </p>

      <div className="mt-6 space-y-3">
        {ROLES.map((role) => (
          <button
            key={role.value}
            onClick={() => setSelected(role.value)}
            className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
              selected === role.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <role.Icon className="mt-0.5 h-6 w-6 shrink-0 text-neutral-700" />
            <div>
              <p className="font-semibold text-neutral-900">{role.label}</p>
              <p className="text-sm text-neutral-600">{role.description}</p>
            </div>
          </button>
        ))}
      </div>

      {selected === 'STUDENT' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700">
            Grade Level
          </label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Setting up…' : 'Continue'}
      </button>
    </div>
  );
}
