'use client';

import { useState } from 'react';

const MEASUREMENT_METHODS = [
  { value: 'CURRICULUM_BASED', label: 'Curriculum-Based' },
  { value: 'OBSERVATION', label: 'Observation' },
  { value: 'RUBRIC', label: 'Rubric' },
  { value: 'STANDARDIZED_ASSESSMENT', label: 'Standardized Assessment' },
  { value: 'WORK_SAMPLE', label: 'Work Sample' },
  { value: 'DATA_COLLECTION', label: 'Data Collection' },
];

export function ProgressEntryForm({
  goalId,
  onSubmitted,
}: {
  goalId: string;
  onSubmitted?: () => void;
}) {
  const [value, setValue] = useState('');
  const [method, setMethod] = useState('OBSERVATION');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/progress-monitoring/goals/${goalId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordedValue: parseFloat(value),
          measurementMethod: method,
          observationDate: date,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to record entry');
      }

      setValue('');
      setNotes('');
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">Record Progress Data</h3>

      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Recorded Value</label>
          <input
            type="number"
            step="any"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Observation Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-neutral-600 mb-1">Measurement Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {MEASUREMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-neutral-600 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Recording...' : 'Record Entry'}
      </button>
    </form>
  );
}
