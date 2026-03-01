import { requirePageUser } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export default async function StateReportingPage() {
  await requirePageUser(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">State Reporting (SPP/APR)</h1>
        <p className="mt-1 text-neutral-600">
          Download state performance plan and annual performance report data for IDEA compliance.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#0C3B2E]">Available Reports</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">SPP/APR Indicators Report</p>
              <p className="text-sm text-neutral-600">
                Indicator 11 (timely evaluation), discipline rates, IEP goal compliance.
              </p>
            </div>
            <a
              href="/api/export/state-report"
              className="rounded-md bg-[#0C3B2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3B2E]/90"
            >
              Download CSV
            </a>
          </div>

          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Compliance Data Export</p>
              <p className="text-sm text-neutral-600">
                All evaluation cases, IEP goals, and discipline cases.
              </p>
            </div>
            <a
              href="/api/export?type=compliance&format=csv"
              className="rounded-md bg-[#0C3B2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3B2E]/90"
            >
              Download CSV
            </a>
          </div>

          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Grade Book Export</p>
              <p className="text-sm text-neutral-600">
                All grades across classes with scores and letter grades.
              </p>
            </div>
            <a
              href="/api/export?type=grades&format=csv"
              className="rounded-md bg-[#0C3B2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C3B2E]/90"
            >
              Download CSV
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
