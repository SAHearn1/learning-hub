/**
 * Centralized Pinecone configuration for the RootWork curriculum vector store.
 *
 * All namespace names, dimension settings, and query defaults live here so that
 * scripts (create-index, verify-index) and runtime code (pinecone.ts, vector-search.ts,
 * ingest route) stay in sync.
 */

// ── Index configuration ──────────────────────────────────────────────

export const PINECONE_CONFIG = {
  indexName: process.env.PINECONE_INDEX || 'rootwork-curriculum',
  dimension: 1536, // text-embedding-3-small
  metric: 'cosine' as const,
  cloud: 'aws' as const,
  region: 'us-east-1',
} as const;

// ── Namespaces ───────────────────────────────────────────────────────

export const NAMESPACES = {
  STANDARDS: 'standards',
  TOPICS: 'topics',
  PROBLEMS: 'problems',
  SUPPLEMENTARY: 'supplementary',
} as const;

export type PineconeNamespace = (typeof NAMESPACES)[keyof typeof NAMESPACES];

export const ALL_NAMESPACES: PineconeNamespace[] = Object.values(NAMESPACES);

// ── Namespace routing helpers ────────────────────────────────────────

/**
 * Determine the correct namespace for a document based on its filename,
 * document type, and associated standard codes.
 */
export function resolveNamespace(
  filename: string,
  documentType: string,
  standardCodes: string[],
): PineconeNamespace {
  const lower = filename.toLowerCase();

  if (lower.includes('standard') || standardCodes.length > 0) {
    return NAMESPACES.STANDARDS;
  }
  if (lower.includes('problem') || lower.includes('exercise') || lower.includes('worksheet')) {
    return NAMESPACES.PROBLEMS;
  }
  if (
    lower.includes('topic') ||
    lower.includes('lesson') ||
    lower.includes('unit') ||
    lower.includes('module')
  ) {
    return NAMESPACES.TOPICS;
  }
  if (documentType === 'json') {
    return NAMESPACES.SUPPLEMENTARY;
  }

  return NAMESPACES.TOPICS; // default
}

// ── Query defaults ───────────────────────────────────────────────────

export const QUERY_DEFAULTS = {
  topK: 5,
  minScore: 0.3,

  /** Namespaces searched for tutoring RAG queries. */
  tutoringSearchNamespaces: [
    NAMESPACES.STANDARDS,
    NAMESPACES.TOPICS,
    NAMESPACES.PROBLEMS,
  ] as PineconeNamespace[],

  /** Namespaces searched for admin / reporting queries. */
  adminSearchNamespaces: ALL_NAMESPACES,
} as const;

// ── Metadata schema documentation ────────────────────────────────────

/**
 * Every vector stored in Pinecone carries this metadata shape.
 * Keeping the schema documented here ensures ingest and query code agree.
 *
 * | Field          | Type     | Description                              |
 * |----------------|----------|------------------------------------------|
 * | filename       | string   | Original source filename                 |
 * | documentType   | string   | File type: md, json, txt, pdf            |
 * | subject        | string   | MATH, SCIENCE, LANGUAGE_ARTS, or ''      |
 * | gradeLevel     | number   | 1-12 or 0 if unspecified                 |
 * | standardCodes  | string[] | Associated curriculum standard codes     |
 * | chunkIndex     | number   | 0-based index within the source document |
 * | totalChunks    | number   | Total chunks produced from the document  |
 * | text           | string   | The chunk text (max 2000 chars)          |
 */
export const METADATA_FIELDS = [
  'filename',
  'documentType',
  'subject',
  'gradeLevel',
  'standardCodes',
  'chunkIndex',
  'totalChunks',
  'text',
] as const;
