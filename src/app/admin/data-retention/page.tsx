import Link from 'next/link';
import { requirePageUser } from '@/lib/page-auth';
import { DataRetentionClient } from './data-retention-client';

export const dynamic = 'force-dynamic';

async function fetchRetentionStats() {
  try {
    const { getRetentionStatistics } = await import('@/lib/compliance/data-retention');
    const statistics = await getRetentionStatistics();
    return { statistics, timestamp: new Date().toISOString() };
  } catch {
    return { statistics: {}, timestamp: new Date().toISOString() };
  }
}

export default async function AdminDataRetentionPage() {
  await requirePageUser(['PLATFORM_ADMIN']);

  const { statistics, timestamp } = await fetchRetentionStats();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/admin/dashboard" className="hover:underline">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span>Data Retention</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Data Retention</h1>
        <p className="mt-1 text-neutral-600">
          Monitor and enforce COPPA/FERPA data retention policies across the platform.
        </p>
      </div>

      <DataRetentionClient stats={statistics as Record<string, { total: number; softDeleted?: number; approachingRetention?: number }>} timestamp={timestamp} />
    </main>
  );
}
