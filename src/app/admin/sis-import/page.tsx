import { requirePageUser } from '@/lib/page-auth';

export default async function SisImportPage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">SIS Bulk Import</h1>
        <p className="mt-2 text-neutral-600">
          Import students from your Student Information System in bulk.
          Supports up to 500 students per request.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">API Endpoint</h2>
        <p className="text-sm text-neutral-600">
          <code className="bg-neutral-100 px-2 py-1 rounded text-sm">POST /api/admin/sis-import</code>
        </p>

        <h3 className="font-medium text-neutral-800">Request format</h3>
        <pre className="bg-neutral-900 text-green-400 rounded-lg p-4 text-xs overflow-auto">
{`{
  "dryRun": false,
  "students": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@school.edu",
      "gradeLevel": 7,
      "externalId": "SIS-12345",
      "parentEmail": "parent@email.com"
    }
  ]
}`}
        </pre>

        <h3 className="font-medium text-neutral-800">Response</h3>
        <pre className="bg-neutral-900 text-green-400 rounded-lg p-4 text-xs overflow-auto">
{`{
  "data": {
    "total": 1,
    "created": 1,
    "skipped": 0,
    "errors": []
  }
}`}
        </pre>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Use <code>dryRun: true</code> to validate your data
            before committing. Students are created with a placeholder Clerk ID —
            send them an invitation from the Admin panel to activate their accounts.
          </p>
        </div>
      </div>
    </main>
  );
}
