'use client';
import { useState } from 'react';

export function JoinClassClient() {
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/student/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: classId.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(`Successfully joined${data.data?.className ? ` "${data.data.className}"` : ' class'}! Refreshing...`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus('error');
        setMessage(
          data.error?.message ?? 'Failed to join class. Check the ID and try again.'
        );
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">Join a Class</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Enter the class ID provided by your educator.
      </p>
      <form onSubmit={handleJoin} className="mt-4 flex gap-3">
        <input
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Class ID"
          maxLength={64}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={classId.trim().length < 4 || status === 'loading'}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === 'loading' ? 'Joining...' : 'Join Class'}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
