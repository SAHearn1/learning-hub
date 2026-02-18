import { RegulateClient } from './regulate-client';

export default function RegulatePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Calm Corner</h1>
      <p className="mt-3 text-neutral-700">
        Reset your nervous system, save a quick check-in, and move back into learning with a clear next step.
      </p>
      <RegulateClient />
    </main>
  );
}
