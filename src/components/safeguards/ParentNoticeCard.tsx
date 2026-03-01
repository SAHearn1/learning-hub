'use client';

import { useState } from 'react';

export type ParentNoticeRow = {
  id: string;
  trigger: string;
  deliveryMethod: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  artifactRef: string;
  schoolYear: string;
  createdAt: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  ANNUAL_NOTICE: 'Annual Procedural Safeguards Notice',
  INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST: 'Safeguards Notice — Referral / Evaluation Request',
  FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR: 'Safeguards Notice — State Complaint',
  FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR: 'Safeguards Notice — Due Process Complaint',
  DISCIPLINARY_CHANGE_OF_PLACEMENT: 'Safeguards Notice — Disciplinary Placement Change',
  PARENT_REQUEST: 'Safeguards Notice — Your Request',
};

type Props = {
  notice: ParentNoticeRow;
};

export function ParentNoticeCard({ notice }: Props) {
  const [acknowledging, setAcknowledging] = useState(false);
  const [status, setStatus] = useState(notice.deliveryStatus);
  const [error, setError] = useState<string | null>(null);

  const isAcknowledged = status === 'ACKNOWLEDGED';

  async function handleAcknowledge() {
    setAcknowledging(true);
    setError(null);
    try {
      const res = await fetch(`/api/safeguards/acknowledge/${notice.id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to acknowledge');
      }
      setStatus('ACKNOWLEDGED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-neutral-900">
            {TRIGGER_LABELS[notice.trigger] ?? 'Procedural Safeguards Notice'}
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Issued {new Date(notice.createdAt).toLocaleDateString()} &middot;{' '}
            School Year {notice.schoolYear}
          </p>
        </div>
        {isAcknowledged && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            Acknowledged
          </span>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-4 flex gap-3">
        <a
          href={notice.artifactRef}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          View Notice
        </a>
        {!isAcknowledged && (
          <button
            onClick={handleAcknowledge}
            disabled={acknowledging}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {acknowledging ? 'Acknowledging...' : 'Acknowledge Receipt'}
          </button>
        )}
      </div>

      {notice.acknowledgedAt && (
        <p className="mt-3 text-xs text-neutral-400">
          Acknowledged on {new Date(notice.acknowledgedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
