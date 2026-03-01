'use client';

import { useState } from 'react';

export function ParentReferralForm({
  studentId,
  onSubmitted,
}: {
  studentId: string;
  onSubmitted?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/evaluation/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          caseType: 'INITIAL',
          referralSource: 'PARENT',
          referralReason: reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit referral');
      }

      setReason('');
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">Request an Evaluation</h3>
      <p className="text-xs text-neutral-500 mb-3">
        Under 34 CFR &sect;300.504(a)(1), you have the right to request an evaluation of your child.
      </p>

      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-3">
        <label className="block text-xs text-neutral-600 mb-1">Reason for Request</label>
        <textarea
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          placeholder="Please describe your concerns about your child's educational needs..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Evaluation Request'}
      </button>
    </form>
  );
}
