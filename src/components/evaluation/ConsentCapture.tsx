'use client';

import { useState } from 'react';

export function ConsentCapture({
  caseId,
  onSubmitted,
}: {
  caseId: string;
  onSubmitted?: () => void;
}) {
  const [decision, setDecision] = useState<'GRANTED' | 'REFUSED'>('GRANTED');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/evaluation/cases/${caseId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType: 'INITIAL_EVALUATION',
          decision,
          respondentName: name,
          consentDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit consent');
      }

      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">Consent for Evaluation</h3>

      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-3">
        <label className="block text-xs text-neutral-600 mb-1">Parent/Guardian Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="decision"
            checked={decision === 'GRANTED'}
            onChange={() => setDecision('GRANTED')}
          />
          I GRANT consent
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="decision"
            checked={decision === 'REFUSED'}
            onChange={() => setDecision('REFUSED')}
          />
          I REFUSE consent
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
          decision === 'GRANTED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        {submitting ? 'Submitting...' : `Submit ${decision === 'GRANTED' ? 'Consent' : 'Refusal'}`}
      </button>
    </form>
  );
}
