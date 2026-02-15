import { generateEmbedding } from '@/lib/embeddings';
import { queryVectors } from '@/lib/pinecone';
import { searchCurriculumHybrid } from '@/lib/hybrid-search';
import { logger } from '@/lib/logger';

export interface SearchResult {
  text: string;
  score: number;
  filename: string;
  sourcePath?: string;
  sectionHeading?: string;
  chunkIndex?: number;
  totalChunks?: number;
  subject?: string;
  gradeLevel?: number;
  standardCodes?: string[];
}

const searchCache = new Map<string, SearchResult[]>();

function cacheKey(query: string, options: { subject?: string; subjects?: string[]; gradeLevel?: number; topK?: number; minScore?: number }): string {
  return JSON.stringify({
    query: query.trim().toLowerCase(),
    subject: options.subject,
    subjects: options.subjects?.slice().sort(),
    gradeLevel: options.gradeLevel,
    topK: options.topK,
    minScore: options.minScore,
  });
}

/**
 * Search the curriculum vector store for content relevant to a student's query.
 * Uses Supabase hybrid retrieval (keyword + vector) when configured, then reranks via cross-encoder.
 * Falls back to Pinecone vector-only search when Supabase is unavailable.
 */
export async function searchCurriculum(
  query: string,
  options: {
    subject?: string;
    subjects?: string[];
    gradeLevel?: number;
    topK?: number;
    minScore?: number;
  } = {},
): Promise<SearchResult[]> {
  const { topK = 5, minScore = 0.3 } = options;

  if (!process.env.OPENAI_API_KEY) {
    logger.debug('RAG search skipped — OPENAI_API_KEY not configured');
    return [];
  }

  const key = cacheKey(query, options);
  const cached = searchCache.get(key);
  if (cached) {
    return cached;
  }

  try {
    const embedding = await generateEmbedding(query);

    let filtered: SearchResult[] = [];

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const hybridResults = await searchCurriculumHybrid(query, embedding, {
        topK,
        subject: options.subject,
        subjects: options.subjects,
        gradeLevel: options.gradeLevel,
      });

      filtered = hybridResults
        .filter(r => r.hybridScore >= minScore)
        .map(r => ({
          text: r.text,
          score: r.hybridScore,
          filename: r.filename,
          sourcePath: r.filename,
          subject: r.subject,
          gradeLevel: r.gradeLevel,
          standardCodes: r.standardCodes,
        }));
    } else if (process.env.PINECONE_API_KEY) {
      const results = await queryVectors(embedding, {
        topK,
        subject: options.subject,
        subjects: options.subjects,
        gradeLevel: options.gradeLevel,
      });

      filtered = results
        .filter(r => r.score >= minScore)
        .map(r => ({
          text: r.metadata.text,
          score: r.score,
          filename: r.metadata.filename,
          sourcePath: (r.metadata as any).sourcePath || r.metadata.filename,
          sectionHeading: (r.metadata as any).sectionHeading || (r.metadata as any).section,
          chunkIndex: r.metadata.chunkIndex,
          totalChunks: r.metadata.totalChunks,
          subject: r.metadata.subject,
          gradeLevel: Array.isArray(r.metadata.gradeLevel) ? r.metadata.gradeLevel[0] : r.metadata.gradeLevel,
          standardCodes: r.metadata.standardCodes,
        }));
    } else {
      logger.debug('RAG search skipped — neither Supabase nor Pinecone is configured');
    }

    logger.debug('Curriculum search results', {
      query: query.substring(0, 80),
      afterFilter: filtered.length,
      retrievalMode: process.env.SUPABASE_URL ? 'hybrid' : 'vector-only',
    });

    searchCache.set(key, filtered);
    return filtered;
  } catch (error) {
    logger.error('Curriculum search failed', { error });
    return [];
  }
}

/**
 * Format search results into a context string for the system prompt.
 */
export function formatCurriculumContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const sections = results.map((r, i) => {
    const header = [
      `[Source ${i + 1}]`,
      r.standardCodes?.length ? `Standards: ${r.standardCodes.join(', ')}` : null,
      r.subject ? `Subject: ${r.subject}` : null,
      r.gradeLevel ? `Grade: ${r.gradeLevel}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return `${header}\n${r.text}`;
  });

  return `### Relevant Curriculum Content\n\nThe following curriculum materials are relevant to the student's current work. Use them to guide your instruction, align with standards, and address common misconceptions.\n\n${sections.join('\n\n---\n\n')}`;
}
