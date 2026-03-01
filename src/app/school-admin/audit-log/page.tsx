'use client';

import { useCallback, useEffect, useState } from 'react';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  timestamp: string;
  chainHash: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (resource) params.set('resource', resource);
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [action, resource]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C3B2E]">Audit Log</h1>
          <p className="mt-1 text-neutral-600">Immutable, hash-chained audit trail.</p>
        </div>
        <a
          href="/api/export?type=audit-log&format=csv"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium hover:bg-neutral-200"
        >
          Export CSV
        </a>
      </div>

      <div className="flex gap-3">
        <input
          placeholder="Filter by action..."
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter by resource..."
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Resource</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.userId.slice(0, 12)}...</td>
                  <td className="px-4 py-3">{l.action}</td>
                  <td className="px-4 py-3">{l.resource}{l.resourceId ? ` (${l.resourceId.slice(0, 8)})` : ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">{l.chainHash.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
