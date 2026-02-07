import { retentionPolicyRecords } from '@/lib/compliance';

export default function DataRetentionPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Data Retention & Lifecycle Policy</h1>
      <p className="mt-4 text-neutral-700">
        This policy defines how long RootWork keeps education records and how records are anonymized or deleted once
        retention windows end.
      </p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full text-left text-sm text-neutral-700">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3">Data category</th>
              <th className="px-4 py-3">Retention period</th>
              <th className="px-4 py-3">Legal basis</th>
              <th className="px-4 py-3">End-of-life handling</th>
            </tr>
          </thead>
          <tbody>
            {retentionPolicyRecords.map((record) => (
              <tr key={record.category} className="border-t border-neutral-200">
                <td className="px-4 py-3">{record.category}</td>
                <td className="px-4 py-3">{record.retentionPeriod}</td>
                <td className="px-4 py-3">{record.legalBasis}</td>
                <td className="px-4 py-3">{record.deletionMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
