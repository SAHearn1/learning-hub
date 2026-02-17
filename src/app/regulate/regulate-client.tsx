'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const defaultStrategies = [
  'Box breathing',
  '5-4-3-2-1 grounding',
  'Short movement break',
  'Positive self-talk',
];

export function RegulateClient() {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [selectedStrategy, setSelectedStrategy] = useState(defaultStrategies[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const readiness = useMemo(() => Math.round(((mood + energy) / 10) * 100), [mood, energy]);

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    setRecommendation(null);

    try {
      const response = await fetch('/api/regulate/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          energy,
          selectedStrategy,
          notes: notes.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to save check-in');
      }
      setRecommendation(payload.data?.recommendation ?? null);
      setMessage('Check-in saved.');
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unable to save check-in';
      setMessage(errMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-neutral-900">Regulation Check-In</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Track how you feel, choose a strategy, and store your check-in before returning to Learn.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-neutral-700">
          Mood (1 low - 5 high)
          <input
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>

        <label className="text-sm text-neutral-700">
          Energy (1 low - 5 high)
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm text-neutral-700">
        Strategy for this break
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          {defaultStrategies.map((strategy) => (
            <option key={strategy} value={strategy}>
              {strategy}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm text-neutral-700">
        Optional notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="What is distracting you right now?"
        />
      </label>

      <div className="mt-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800">
        Regulation readiness: <span className="font-semibold">{readiness}%</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Check-In'}
        </button>
        <Link href="/learn" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Return to Learn
        </Link>
      </div>

      {message && <p className="mt-3 text-sm text-neutral-700">{message}</p>}
      {recommendation && (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {recommendation}
        </p>
      )}
    </section>
  );
}
