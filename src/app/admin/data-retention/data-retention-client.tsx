'use client';

import { useState } from 'react';

interface RetentionStats {
  sessions?: { total: number; softDeleted: number; approachingRetention: number };
  assessments?: { total: number };
  consentRecords?: { total: number };
  auditLogs?: { total: number };
}

interface Props {
  stats: RetentionStats;
  timestamp: string;
}

export function DataRetentionClient({ stats, timestamp }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const runEnforcement = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/data-retention', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message ?? 'Enforcement completed.' });
      } else {
        setResult({ success: false, message: data.message ?? 'Enforcement failed.' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Network error — enforcement could not be triggered.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total Sessions</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">
            {stats.sessions?.total ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {stats.sessions?.softDeleted ?? 0} soft-deleted &bull;{' '}
            {stats.sessions?.approachingRetention ?? 0} approaching limit
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total Assessments</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">
            {stats.assessments?.total ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Consent Records</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">
            {stats.consentRecords?.total ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Audit Log Entries</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">
            {stats.auditLogs?.total ?? 0}
          </p>
        </div>
      </div>

      {/* Enforcement trigger */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-900">Retention Enforcement</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Manually trigger the data retention enforcement job. This will purge records that have
          exceeded their retention window according to COPPA/FERPA policy.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Last stats fetched: {new Date(timestamp).toLocaleString()}
        </p>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={runEnforcement}
            disabled={running}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {running ? 'Running...' : 'Run Retention Enforcement'}
          </button>
        </div>

        {result && (
          <div
            className={`mt-4 rounded-lg p-4 text-sm ${
              result.success
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {result.message}
          </div>
        )}
      </div>

      {/* Policy reference */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-900">Retention Policy</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left text-neutral-500 font-medium">Data Category</th>
                <th className="px-4 py-3 text-left text-neutral-500 font-medium">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              {[
                { category: 'Session Transcripts', period: '24 months after last activity' },
                { category: 'Assessment Outcomes', period: '36 months after school year closes' },
                { category: 'Parental Consent Records', period: '7 years from consent action (COPPA)' },
                { category: 'Audit Logs', period: '13 months rolling (SOC 2)' },
                { category: 'Soft-deleted Data', period: '30-day grace period before hard delete' },
              ].map((row) => (
                <tr key={row.category} className="border-t border-neutral-100">
                  <td className="px-4 py-3 text-neutral-900">{row.category}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
