'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SuspendButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSuspend() {
    if (!confirm('Are you sure you want to suspend this tenant?')) return;

    setPending(true);
    try {
      const res = await fetch(`/api/admin/super/tenants/${tenantId}/suspension`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: true, reason: 'Suspended by platform admin' }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to suspend tenant.');
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSuspend}
      disabled={pending}
      className="rounded px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Suspending...' : 'Suspend'}
    </button>
  );
}
