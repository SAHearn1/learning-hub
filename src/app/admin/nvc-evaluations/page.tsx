import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

const PAGE_SIZE = 25;

export default async function NvcEvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePageUser(['PLATFORM_ADMIN']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [total, flaggedCount, evaluations, avgScoreResult] = await Promise.all([
    db.nVCQualityEvaluation.count(),
    db.nVCQualityEvaluation.count({ where: { isCompliant: false } }),
    db.nVCQualityEvaluation.findMany({
      orderBy: { evaluatedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        sessionId: true,
        tenantId: true,
        evaluatedAt: true,
        isCompliant: true,
        nvcScore: true,
        reviewStatus: true,
        concerns: true,
      },
    }),
    db.nVCQualityEvaluation.aggregate({ _avg: { nvcScore: true } }),
  ]);

  const avgScore =
    avgScoreResult._avg.nvcScore !== null
      ? Math.round(avgScoreResult._avg.nvcScore)
      : null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const reviewStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'FLAGGED': return 'bg-red-100 text-red-800';
      case 'REVIEWED': return 'bg-blue-100 text-blue-800';
      case 'DISMISSED': return 'bg-neutral-100 text-neutral-600';
      default: return 'bg-yellow-100 text-yellow-800'; // PENDING
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/admin/dashboard" className="hover:underline">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span>NVC Evaluations</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">NVC Quality Evaluations</h1>
        <p className="mt-1 text-neutral-600">
          AI-generated NVC compliance evaluations for assistant messages.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total Evaluated</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">{total}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Non-Compliant</p>
          <p className="mt-2 text-4xl font-bold text-red-600">{flaggedCount}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {total > 0 ? `${Math.round((flaggedCount / total) * 100)}%` : '0%'} of total
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Average NVC Score</p>
          <p className="mt-2 text-4xl font-bold text-neutral-900">
            {avgScore !== null ? `${avgScore}` : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-neutral-400">out of 100</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            {total} evaluation{total !== 1 ? 's' : ''} &mdash; page {page} of {totalPages || 1}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Evaluated At</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Session ID</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Score</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Compliant</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Review Status</th>
                <th className="px-6 py-3 text-left text-neutral-500 font-medium">Concerns</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-400">
                    No evaluations found.
                  </td>
                </tr>
              ) : (
                evaluations.map((ev) => (
                  <tr key={ev.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-6 py-4 text-neutral-700 whitespace-nowrap">
                      {new Date(ev.evaluatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-500 truncate max-w-[10rem]">
                      {ev.sessionId}
                    </td>
                    <td className="px-6 py-4 text-neutral-900 font-semibold">
                      {Math.round(ev.nvcScore)}
                    </td>
                    <td className="px-6 py-4">
                      {ev.isCompliant ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${reviewStatusColor(ev.reviewStatus)}`}>
                        {ev.reviewStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-xs">
                      {ev.concerns.length > 0 ? ev.concerns.slice(0, 2).join(', ') + (ev.concerns.length > 2 ? ` +${ev.concerns.length - 2}` : '') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
            <div>
              {page > 1 && (
                <Link
                  href={`/admin/nvc-evaluations?page=${page - 1}`}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Previous
                </Link>
              )}
            </div>
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <div>
              {page < totalPages && (
                <Link
                  href={`/admin/nvc-evaluations?page=${page + 1}`}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
