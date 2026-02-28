'use client';

import { useEffect, useState } from 'react';

interface LinkedChild {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface CommunicationPrefs {
  emailNotifications: boolean;
  weeklyDigest: boolean;
  sessionAlerts: boolean;
  progressMilestones: boolean;
}

const DEFAULT_PREFS: CommunicationPrefs = {
  emailNotifications: true,
  weeklyDigest: true,
  sessionAlerts: false,
  progressMilestones: true,
};

export function ParentSettingsClient() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<CommunicationPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

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

  async function fetchPrefs() {
    try {
      const res = await fetch('/api/parent/settings');
      if (res.ok) {
        const json = await res.json();
        const loaded = json.data?.communicationPrefs ?? json.communicationPrefs;
        if (loaded) {
          setPrefs({ ...DEFAULT_PREFS, ...loaded });
        }
      }
    } catch {
      // silently keep defaults
    } finally {
      setPrefsLoading(false);
    }
  }

  useEffect(() => {
    fetchChildren();
    fetchPrefs();
  }, []);

  async function handleTogglePref(key: keyof CommunicationPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefsSaving(true);
    try {
      const res = await fetch('/api/parent/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationPrefs: updated }),
      });
      if (!res.ok) {
        // revert on failure
        setPrefs(prefs);
        setError('Failed to save notification preferences.');
      }
    } catch {
      setPrefs(prefs);
      setError('Network error saving preferences.');
    } finally {
      setPrefsSaving(false);
    }
  }

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
      <section id="children">
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

      <section>
        <h2 className="text-xl font-semibold text-neutral-900">Notification Preferences</h2>
        <p className="mt-1 text-sm text-neutral-600">Choose which notifications you receive about your children's activity.</p>
        {prefsLoading ? (
          <p className="mt-3 text-sm text-neutral-500">Loading preferences…</p>
        ) : (
          <div className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {(
              [
                { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications by email' },
                { key: 'weeklyDigest', label: 'Weekly Digest', description: "Summary of your children's weekly learning activity" },
                { key: 'sessionAlerts', label: 'Session Alerts', description: 'Alert when a child starts or ends a learning session' },
                { key: 'progressMilestones', label: 'Progress Milestones', description: 'Notify when a child achieves a mastery milestone' },
              ] as { key: keyof CommunicationPrefs; label: string; description: string }[]
            ).map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-medium text-neutral-900">{label}</p>
                  <p className="text-sm text-neutral-500">{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  onClick={() => handleTogglePref(key)}
                  disabled={prefsSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${prefs[key] ? 'bg-blue-600' : 'bg-neutral-300'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prefs[key] ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
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
