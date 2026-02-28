'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SuspendButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuspend() {
    const reason = window.prompt(
      `Reason for suspending "${tenantName}" (required):`,
    );
    if (!reason || reason.trim().length < 3) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/super/tenants/${tenantId}/suspension`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: true, reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? 'Failed to suspend tenant.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSuspend}
        disabled={pending}
        className="rounded px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Suspending…' : 'Suspend'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
