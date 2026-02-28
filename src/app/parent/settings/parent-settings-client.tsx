'use client';

import { useEffect, useState } from 'react';

interface LinkedChild {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export function ParentSettingsClient() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function fetchChildren() {
    try {
      const res = await fetch('/api/parent/students');
      if (!res.ok) throw new Error('Failed to load children');
      const json = await res.json();
      setChildren(json.data ?? []);
    } catch {
      setError('Could not load linked children.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChildren();
  }, []);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLinking(true);

    try {
      const res = await fetch('/api/parent/children/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to link child');
        return;
      }
      setSuccess(`Linked ${json.data.student.firstName ?? 'student'} successfully.`);
      setEmail('');
      fetchChildren();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(studentUserId: string) {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/parent/children/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentUserId }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Failed to unlink child');
        return;
      }
      setSuccess('Child unlinked.');
      fetchChildren();
    } catch {
      setError('Network error. Please try again.');
    }
  }

  if (loading) {
    return <p className="text-neutral-500">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Linked Children</h2>
        {children.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            No children linked yet. Use the form below to link a student account.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {children.map((child) => (
              <li key={child.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-neutral-900">
                    {child.firstName} {child.lastName}
                  </p>
                  {child.email && (
                    <p className="text-sm text-neutral-500">{child.email}</p>
                  )}
                </div>
                <button
                  onClick={() => handleUnlink(child.id)}
                  className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Link a Child</h2>
        <form onSubmit={handleLink} className="mt-3 flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Student email address"
            required
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={linking}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {linking ? 'Linking…' : 'Link Child'}
          </button>
        </form>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}
    </div>
  );
}
