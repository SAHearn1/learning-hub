import { retentionPolicyRecords } from '@/lib/compliance';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Privacy Policy (Draft for School Partner Review)</h1>
      <p className="mt-4 text-neutral-700">
        RootWork is built for K-12 settings and follows privacy-by-design principles to limit personal data collection,
        protect student learning records, and support parent rights. This draft summarizes current controls while legal
        counsel finalizes launch language.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Data we collect</h2>
        <ul className="list-disc space-y-2 pl-6 text-neutral-700">
          <li>Account identifiers (name, email, role, school/tenant association).</li>
          <li>Learning interaction data (session transcripts, assessment responses, progress signals).</li>
          <li>Safety and compliance events (consent changes, admin actions, security logs).</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">How we use data</h2>
        <ul className="list-disc space-y-2 pl-6 text-neutral-700">
          <li>Deliver adaptive tutoring and progress insights requested by schools and families.</li>
          <li>Meet legal obligations including COPPA/FERPA-aligned consent and record-keeping workflows.</li>
          <li>Support platform security, abuse prevention, and operational reliability.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Parent and student rights</h2>
        <p className="text-neutral-700">
          Parents/guardians can request consent updates, data export, and data deletion review through support channels
          or the compliance API endpoints. Minor data requests require parent/admin authorization.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900">Retention snapshot</h2>
        <div className="rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Retention</th>
              </tr>
            </thead>
            <tbody>
              {retentionPolicyRecords.map((record) => (
                <tr key={record.category} className="border-t border-neutral-200 text-neutral-700">
                  <td className="px-4 py-3">{record.category}</td>
                  <td className="px-4 py-3">{record.retentionPeriod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
