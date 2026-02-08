import { Pinecone, type Index, type RecordMetadata } from '@pinecone-database/pinecone';
import { PINECONE_CONFIG, type PineconeNamespace } from '@/lib/pinecone-config';
import { logger } from '@/lib/logger';

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPinecone(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

export function getIndex(): Index {
  if (!pineconeIndex) {
    pineconeIndex = getPinecone().index(PINECONE_CONFIG.indexName);
  }
  return pineconeIndex;
}

export interface CurriculumMetadata {
  filename: string;
  documentType: string;
  subject: string;
  gradeLevel: number;
  standardCodes: string[];
  chunkIndex: number;
  totalChunks: number;
  text: string;
}

/**
 * Upsert embedding vectors into a specific Pinecone namespace.
 */
export async function upsertVectors(
  vectors: {
    id: string;
    values: number[];
    metadata: CurriculumMetadata;
  }[],
  namespace?: PineconeNamespace,
): Promise<string[]> {
  const index = getIndex();
  const target = namespace ? index.namespace(namespace) : index;

  const batchSize = 100;
  const ids: string[] = [];

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await target.upsert({ records: batch as unknown as { id: string; values: number[]; metadata: RecordMetadata }[] });
    ids.push(...batch.map(v => v.id));

    logger.debug('Pinecone upsert batch', {
      namespace: namespace ?? 'default',
      upserted: ids.length,
      total: vectors.length,
    });
  }

  return ids;
}

/**
 * Query a specific Pinecone namespace for similar curriculum content.
 */
export async function queryVectors(
  embedding: number[],
  options: {
    topK?: number;
    subject?: string;
    gradeLevel?: number;
    namespace?: PineconeNamespace;
  } = {},
): Promise<{
  id: string;
  score: number;
  metadata: CurriculumMetadata;
}[]> {
  const index = getIndex();
  const { topK = 5, subject, gradeLevel, namespace } = options;
  const target = namespace ? index.namespace(namespace) : index;

  const filter: Record<string, unknown> = {};
  if (subject) {
    filter.subject = { $eq: subject };
  }
  if (gradeLevel) {
    filter.gradeLevel = { $eq: gradeLevel };
  }

  const results = await target.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  return (results.matches || []).map(match => ({
    id: match.id,
    score: match.score ?? 0,
    metadata: match.metadata as unknown as CurriculumMetadata,
  }));
}

/**
 * Query multiple namespaces in parallel and merge results by score.
 */
export async function queryMultipleNamespaces(
  embedding: number[],
  namespaces: PineconeNamespace[],
  options: {
    topK?: number;
    subject?: string;
    gradeLevel?: number;
  } = {},
): Promise<{
  id: string;
  score: number;
  metadata: CurriculumMetadata;
  namespace: string;
}[]> {
  const { topK = 5 } = options;

  const results = await Promise.all(
    namespaces.map(async (ns) => {
      const matches = await queryVectors(embedding, { ...options, namespace: ns });
      return matches.map(m => ({ ...m, namespace: ns }));
    }),
  );

  return results
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Delete vectors by ID from a specific namespace.
 */
export async function deleteVectors(ids: string[], namespace?: PineconeNamespace): Promise<void> {
  const index = getIndex();
  const target = namespace ? index.namespace(namespace) : index;
  await target.deleteMany(ids);
}

/**
 * Get vector count stats per namespace.
 */
export async function getIndexStats(): Promise<{
  totalVectors: number;
  namespaces: Record<string, number>;
}> {
  const index = getIndex();
  const stats = await index.describeIndexStats();

  const namespaces: Record<string, number> = {};
  if (stats.namespaces) {
    for (const [ns, nsStats] of Object.entries(stats.namespaces)) {
      namespaces[ns] = nsStats.recordCount ?? 0;
    }
  }

  return {
    totalVectors: stats.totalRecordCount ?? 0,
    namespaces,
  };
}
