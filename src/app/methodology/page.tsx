import { phaseOrder, phaseTransitions } from '@/config/five-rs';
import { BRAND } from '@/brand/brand';

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Methodology</p>
        <h1 className="mt-2 text-4xl font-bold text-neutral-900">The RootWork 5R Learning Cycle</h1>
        <p className="mt-4 text-lg text-neutral-700">
          Our trauma-informed tutoring flow centers safety, regulation, metacognition, and real-world transfer.
        </p>
      </header>

      <section className="mb-12 grid gap-4 md:grid-cols-2">
        {phaseOrder.map((phase) => {
          const details = BRAND.phases[phase];

          return (
            <article key={phase} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{phase}</p>
              <h2 className="mt-1 text-2xl font-semibold text-neutral-900">{details.name}</h2>
              <p className="mt-2 text-neutral-700">{details.description}</p>
              <p className="mt-3 text-sm text-neutral-600">
                <span className="font-semibold text-neutral-800">Focus:</span> {details.action}
              </p>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-neutral-900">Phase transitions</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-4 py-3 font-semibold">From</th>
                <th className="px-4 py-3 font-semibold">To</th>
                <th className="px-4 py-3 font-semibold">Trigger</th>
                <th className="px-4 py-3 font-semibold">Conditions</th>
              </tr>
            </thead>
            <tbody>
              {phaseTransitions.map((transition) => (
                <tr key={`${transition.from}-${transition.to}-${transition.trigger}`} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-900">{transition.from}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{transition.to}</td>
                  <td className="px-4 py-3 text-neutral-700">{transition.trigger}</td>
                  <td className="px-4 py-3 text-neutral-700">{transition.conditions.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
