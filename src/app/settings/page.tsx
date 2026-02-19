import { requirePageUser } from '@/lib/page-auth';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  await requirePageUser(['STUDENT']);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-3 text-neutral-700">
        Manage profile, learning preferences, and Calm Corner accessibility in one place.
      </p>

      <SettingsClient />
    </main>
  );
}
