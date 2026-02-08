import { Pinecone, type Index, type RecordMetadata } from '@pinecone-database/pinecone';
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
    const indexName = process.env.PINECONE_INDEX || 'rootwork-curriculum';
    pineconeIndex = getPinecone().index(indexName);
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
  course?: string;
  module?: string;
  [key: string]: unknown; // Allow additional metadata fields
}

/**
 * Upsert embedding vectors into Pinecone with curriculum metadata.
 */
export async function upsertVectors(
  vectors: {
    id: string;
    values: number[];
    metadata: CurriculumMetadata;
  }[],
): Promise<string[]> {
  const index = getIndex();

  // Pinecone supports up to 100 vectors per upsert
  const batchSize = 100;
  const ids: string[] = [];

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert({ records: batch as unknown as { id: string; values: number[]; metadata: RecordMetadata }[] });
    ids.push(...batch.map(v => v.id));

    logger.debug('Pinecone upsert batch', {
      upserted: ids.length,
      total: vectors.length,
    });
  }

  return ids;
}

/**
 * Query Pinecone for similar curriculum content.
 */
export async function queryVectors(
  embedding: number[],
  options: {
    topK?: number;
    subject?: string;
    gradeLevel?: number;
    course?: string;
    module?: string;
    documentType?: string;
  } = {},
): Promise<{
  id: string;
  score: number;
  metadata: CurriculumMetadata;
}[]> {
  const index = getIndex();
  const { topK = 5, subject, gradeLevel, course, module, documentType = 'curriculum' } = options;

  // Build metadata filter
  const filter: Record<string, unknown> = {};
  if (subject) {
    filter.subject = { $eq: subject };
  }
  if (gradeLevel) {
    filter.gradeLevel = { $eq: gradeLevel };
  }
  if (course) {
    filter.course = { $eq: course };
  }
  if (module) {
    filter.module = { $eq: module };
  }
  if (documentType) {
    filter.documentType = { $eq: documentType };
  }

  const results = await index.query({
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
 * Delete vectors by ID.
 */
export async function deleteVectors(ids: string[]): Promise<void> {
  const index = getIndex();
  await index.deleteMany({ ids });
}
