import { requirePageUser } from '@/lib/page-auth';
import { IngestClient } from './ingest-client';

export default async function IngestPage() {
  await requirePageUser(['PLATFORM_ADMIN']);
  return <IngestClient />;
}
