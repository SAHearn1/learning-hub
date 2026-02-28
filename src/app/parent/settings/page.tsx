import { requirePageUser } from '@/lib/page-auth';
import { ParentSettingsClient } from './parent-settings-client';

export default async function ParentSettingsPage() {
  await requirePageUser(['PARENT']);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Parent Settings</h1>
      <p className="mt-2 text-neutral-700">
        Manage linked children and notification preferences.
      </p>
      <ParentSettingsClient />
    </main>
  );
}
