import { generateEmbedding } from '@/lib/embeddings';
import { queryMultipleNamespaces } from '@/lib/pinecone';
import { QUERY_DEFAULTS } from '@/lib/pinecone-config';
import { logger } from '@/lib/logger';

export interface SearchResult {
  text: string;
  score: number;
  filename: string;
  namespace: string;
  subject?: string;
  gradeLevel?: number;
  standardCodes?: string[];
}

/**
 * Search the curriculum vector store for content relevant to a student's query.
 * Queries standards, topics, and problems namespaces in parallel, then merges
 * results by cosine similarity score.
 */
export async function searchCurriculum(
  query: string,
  options: {
    subject?: string;
    gradeLevel?: number;
    topK?: number;
    minScore?: number;
  } = {},
): Promise<SearchResult[]> {
  const { topK = QUERY_DEFAULTS.topK, minScore = QUERY_DEFAULTS.minScore } = options;

  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
    logger.debug('RAG search skipped — OPENAI_API_KEY or PINECONE_API_KEY not configured');
    return [];
  }

  try {
    const embedding = await generateEmbedding(query);

    const results = await queryMultipleNamespaces(
      embedding,
      QUERY_DEFAULTS.tutoringSearchNamespaces,
      {
        topK,
        subject: options.subject,
        gradeLevel: options.gradeLevel,
      },
    );

    const filtered = results
      .filter(r => r.score >= minScore)
      .map(r => ({
        text: r.metadata.text,
        score: r.score,
        filename: r.metadata.filename,
        namespace: r.namespace,
        subject: r.metadata.subject,
        gradeLevel: r.metadata.gradeLevel,
        standardCodes: r.metadata.standardCodes,
      }));

    logger.debug('Curriculum search results', {
      query: query.substring(0, 80),
      namespacesSearched: QUERY_DEFAULTS.tutoringSearchNamespaces,
      resultsFound: results.length,
      afterFilter: filtered.length,
    });

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
