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
  gradeLevel: number | number[];
  gradeBand?: string;
  standardCodes: string[];
  chunkIndex: number;
  totalChunks: number;
  text: string;

  // Curriculum/source metadata
  chapter?: string;
  title?: string;
  topics?: string[];
  sourcePath?: string;
  sourceCollection?: string;
  sectionHeading?: string;

  // Citation metadata
  section?: string;
  pageNumber?: number;
  paragraphId?: string;
  sourceUrl?: string;
  course?: string;
  module?: string;
}

export function buildCurriculumFilter(options: {
  subject?: string;
  subjects?: string[];
  gradeLevel?: number;
  gradeBand?: string;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (options.subjects && options.subjects.length > 0) {
    filter.subject = { $in: options.subjects };
  } else if (options.subject) {
    filter.subject = { $eq: options.subject };
  }

  if (options.gradeLevel) {
    filter.gradeLevel = { $eq: options.gradeLevel };
  }

  if (options.gradeBand) {
    filter.gradeBand = { $eq: options.gradeBand };
  }

  return filter;
}

export async function upsertVectors(
  vectors: {
    id: string;
    values: number[];
    metadata: CurriculumMetadata;
  }[],
  options: { namespace?: string } = {},
): Promise<string[]> {
  const baseIndex = getIndex();
  const index = options.namespace ? baseIndex.namespace(options.namespace) : baseIndex;

  const batchSize = 100;
  const ids: string[] = [];

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert({ records: batch as unknown as { id: string; values: number[]; metadata: RecordMetadata }[] });
    ids.push(...batch.map(v => v.id));

    logger.debug('Pinecone upsert batch', {
      upserted: ids.length,
      total: vectors.length,
      namespace: options.namespace,
    });
  }

  return ids;
}

export async function queryVectors(
  embedding: number[],
  options: {
    topK?: number;
    subject?: string;
    subjects?: string[];
    gradeLevel?: number;
    gradeBand?: string;
    namespace?: string;
  } = {},
): Promise<{
  id: string;
  score: number;
  metadata: CurriculumMetadata;
}[]> {
  const baseIndex = getIndex();
  const index = options.namespace ? baseIndex.namespace(options.namespace) : baseIndex;
  const { topK = 5, subject, subjects, gradeLevel, gradeBand } = options;

  const filter = buildCurriculumFilter({ subject, subjects, gradeLevel, gradeBand });

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

export async function deleteVectors(ids: string[], options: { namespace?: string } = {}): Promise<void> {
  const baseIndex = getIndex();
  const index = options.namespace ? baseIndex.namespace(options.namespace) : baseIndex;
  await index.deleteMany({ ids });
}
