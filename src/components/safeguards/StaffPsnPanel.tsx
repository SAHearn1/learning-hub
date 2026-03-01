'use client';

import { useState } from 'react';

export type PsnNoticeRow = {
  id: string;
  trigger: string;
  deliveryMethod: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  noticeDocHash: string;
  artifactRef: string;
  schoolYear: string;
  createdAt: string;
  proceduralEvent: {
    id: string;
    eventType: string;
    trigger: string;
    correlationId: string;
    isFirstOfType: boolean;
    createdAt: string;
  };
};

export type PsnEventRow = {
  id: string;
  eventType: string;
  trigger: string;
  schoolYear: string;
  correlationId: string;
  isFirstOfType: boolean;
  createdAt: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  ANNUAL_NOTICE: 'Annual Notice',
  INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST: 'Initial Referral / Parent Eval Request',
  FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR: 'First State Complaint (School Year)',
  FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR: 'First Due Process Complaint (School Year)',
  DISCIPLINARY_CHANGE_OF_PLACEMENT: 'Disciplinary Change of Placement',
  PARENT_REQUEST: 'Parent Request',
};

const TRIGGER_LEGAL_REFS: Record<string, string> = {
  ANNUAL_NOTICE: '34 CFR §300.504(a)',
  INITIAL_REFERRAL_OR_PARENT_EVAL_REQUEST: '34 CFR §300.504(a)(1)',
  FIRST_STATE_COMPLAINT_IN_SCHOOL_YEAR: '34 CFR §300.504(a)(2)',
  FIRST_DUE_PROCESS_COMPLAINT_IN_SCHOOL_YEAR: '34 CFR §300.504(a)(3)',
  DISCIPLINARY_CHANGE_OF_PLACEMENT: '34 CFR §300.504(a)(4), §300.530',
  PARENT_REQUEST: '34 CFR §300.504(a)',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  GENERATED: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-blue-100 text-blue-800',
  ACKNOWLEDGED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

type Props = {
  studentId: string;
  notices: PsnNoticeRow[];
  events: PsnEventRow[];
};

export function StaffPsnPanel({ studentId, notices, events }: Props) {
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find events that don't yet have a DELIVERED/ACKNOWLEDGED notice
  const pendingEvents = events.filter((evt) => {
    const matchingNotice = notices.find(
      (n) =>
        n.proceduralEvent.id === evt.id &&
        (n.deliveryStatus === 'DELIVERED' || n.deliveryStatus === 'ACKNOWLEDGED'),
    );
    return !matchingNotice;
  });

  async function handleIssue(eventId: string, trigger: string) {
    setIssuing(true);
    setError(null);
    try {
      const res = await fetch('/api/safeguards/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          proceduralEventId: eventId,
          trigger,
          deliveryMethod: 'PORTAL',
          markDelivered: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to issue notice');
      }
      // Reload page to reflect updated state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert banner for pending obligations */}
      {pendingEvents.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-800">
                Procedural Safeguards Notice Required
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                {pendingEvents.length} event(s) require notice issuance under IDEA.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Pending events requiring action */}
      {pendingEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-900">Pending Obligations</h2>
          <div className="mt-3 space-y-3">
            {pendingEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {TRIGGER_LABELS[evt.trigger] ?? evt.trigger}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {TRIGGER_LEGAL_REFS[evt.trigger] ?? ''} &middot;{' '}
                    {new Date(evt.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleIssue(evt.id, evt.trigger)}
                  disabled={issuing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {issuing ? 'Issuing...' : 'Issue Notice'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All notices */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Notice History</h2>
        {notices.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No notices have been issued yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {TRIGGER_LABELS[notice.trigger] ?? notice.trigger}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {notice.deliveryMethod} &middot;{' '}
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[notice.deliveryStatus] ?? 'bg-neutral-100 text-neutral-700'}`}
                >
                  {notice.deliveryStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
