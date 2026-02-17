'use client';

import { useEffect, useMemo, useState } from 'react';

type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';
type Pace = 'GUIDED' | 'INDEPENDENT' | 'CHALLENGE';

type SettingsState = {
  firstName: string;
  lastName: string;
  learningPreferences: {
    preferredSubjects: Subject[];
    pace: Pace;
    accessibility: {
      textToSpeech: boolean;
      dyslexicFont: boolean;
      highContrast: boolean;
    };
  };
  regulationProfile: {
    calmingStrategies: string[];
    preferredBreakDuration: number;
  };
};

const defaultState: SettingsState = {
  firstName: '',
  lastName: '',
  learningPreferences: {
    preferredSubjects: [],
    pace: 'GUIDED',
    accessibility: {
      textToSpeech: false,
      dyslexicFont: false,
      highContrast: false,
    },
  },
  regulationProfile: {
    calmingStrategies: [],
    preferredBreakDuration: 5,
  },
};

const subjectOptions: Array<{ value: Subject; label: string }> = [
  { value: 'MATH', label: 'Math' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'LANGUAGE_ARTS', label: 'Language Arts' },
  { value: 'FINANCIAL_LITERACY', label: 'Financial Literacy' },
];

export function SettingsClient() {
  const [state, setState] = useState<SettingsState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/student/settings');
        if (!response.ok) {
          throw new Error('Unable to load settings');
        }
        const payload = await response.json();
        if (!cancelled && payload?.data) {
          setState(payload.data as SettingsState);
        }
      } catch {
        if (!cancelled) {
          setMessage('Unable to load student settings right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const strategiesText = useMemo(
    () => state.regulationProfile.calmingStrategies.join(', '),
    [state.regulationProfile.calmingStrategies],
  );

  const toggleSubject = (subject: Subject) => {
    setState((current) => {
      const exists = current.learningPreferences.preferredSubjects.includes(subject);
      return {
        ...current,
        learningPreferences: {
          ...current.learningPreferences,
          preferredSubjects: exists
            ? current.learningPreferences.preferredSubjects.filter((s) => s !== subject)
            : [...current.learningPreferences.preferredSubjects, subject],
        },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);

    const calmingStrategies = strategiesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);

    const payload: SettingsState = {
      ...state,
      regulationProfile: {
        ...state.regulationProfile,
        calmingStrategies,
      },
    };

    try {
      const response = await fetch('/api/student/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to save settings');
      }
      setState(result.data as SettingsState);
      setMessage('Settings saved.');
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setMessage(errMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="mt-6 text-neutral-600">Loading your settings...</p>;
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-neutral-700">
            First name
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={state.firstName}
              onChange={(e) => setState((current) => ({ ...current, firstName: e.target.value }))}
            />
          </label>
          <label className="text-sm text-neutral-700">
            Last name
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={state.lastName}
              onChange={(e) => setState((current) => ({ ...current, lastName: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Learning Preferences</h2>
        <p className="mt-2 text-sm text-neutral-600">Choose subjects and pacing for your daily sessions.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {subjectOptions.map((option) => {
            const selected = state.learningPreferences.preferredSubjects.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  selected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-300 text-neutral-700'
                }`}
                onClick={() => toggleSubject(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <label className="text-sm text-neutral-700">
            Session pace
            <select
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
              value={state.learningPreferences.pace}
              onChange={(e) => {
                const pace = e.target.value as Pace;
                setState((current) => ({
                  ...current,
                  learningPreferences: { ...current.learningPreferences, pace },
                }));
              }}
            >
              <option value="GUIDED">Guided</option>
              <option value="INDEPENDENT">Independent</option>
              <option value="CHALLENGE">Challenge mode</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Calm Corner Preferences</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-neutral-700">
            Preferred break length (minutes)
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={state.regulationProfile.preferredBreakDuration}
              onChange={(e) => {
                const preferredBreakDuration = Number(e.target.value) || 5;
                setState((current) => ({
                  ...current,
                  regulationProfile: { ...current.regulationProfile, preferredBreakDuration },
                }));
              }}
            />
          </label>
          <label className="text-sm text-neutral-700">
            Accessibility
            <div className="mt-2 space-y-2 rounded-md border border-neutral-200 p-3">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={state.learningPreferences.accessibility.textToSpeech}
                  onChange={(e) => setState((current) => ({
                    ...current,
                    learningPreferences: {
                      ...current.learningPreferences,
                      accessibility: {
                        ...current.learningPreferences.accessibility,
                        textToSpeech: e.target.checked,
                      },
                    },
                  }))}
                />
                Text-to-speech
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={state.learningPreferences.accessibility.dyslexicFont}
                  onChange={(e) => setState((current) => ({
                    ...current,
                    learningPreferences: {
                      ...current.learningPreferences,
                      accessibility: {
                        ...current.learningPreferences.accessibility,
                        dyslexicFont: e.target.checked,
                      },
                    },
                  }))}
                />
                Dyslexic-friendly font
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={state.learningPreferences.accessibility.highContrast}
                  onChange={(e) => setState((current) => ({
                    ...current,
                    learningPreferences: {
                      ...current.learningPreferences,
                      accessibility: {
                        ...current.learningPreferences.accessibility,
                        highContrast: e.target.checked,
                      },
                    },
                  }))}
                />
                High contrast
              </label>
            </div>
          </label>
        </div>
        <label className="mt-4 block text-sm text-neutral-700">
          Favorite calming strategies (comma-separated)
          <textarea
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            rows={3}
            value={strategiesText}
            onChange={(e) => {
              const calmingStrategies = e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              setState((current) => ({
                ...current,
                regulationProfile: { ...current.regulationProfile, calmingStrategies },
              }));
            }}
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {message && <p className="text-sm text-neutral-700">{message}</p>}
      </div>
    </div>
  );
}
