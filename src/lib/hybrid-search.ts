import { logger } from '@/lib/logger';

export interface HybridSearchResult {
  id: string;
  text: string;
  filename: string;
  subject?: string;
  gradeLevel?: number;
  standardCodes?: string[];
  vectorScore: number;
  keywordScore: number;
  hybridScore: number;
}

interface SupabaseHybridRow {
  id: string;
  text: string;
  filename: string;
  subject?: string;
  grade_level?: number;
  standard_codes?: string[];
  vector_score?: number;
  keyword_score?: number;
  hybrid_score?: number;
}

const DEFAULT_RPC = 'match_curriculum_hybrid';
const DEFAULT_CROSS_ENCODER_MODEL = 'cross-encoder/ms-marco-MiniLM-L-6-v2';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

async function callHybridRpc(query: string, embedding: number[], options: { subject?: string; gradeLevel?: number; topK: number }): Promise<HybridSearchResult[]> {
  const config = getSupabaseConfig();
  if (!config) return [];

  const rpcName = process.env.SUPABASE_HYBRID_RPC ?? DEFAULT_RPC;
  const rpcUrl = `${config.url}/rest/v1/rpc/${rpcName}`;

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      query_text: query,
      query_embedding: embedding,
      match_count: Math.max(options.topK * 3, 10),
      match_subject: options.subject,
      match_grade_level: options.gradeLevel,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase hybrid RPC failed (${response.status}): ${errorText}`);
  }

  const rows = (await response.json()) as SupabaseHybridRow[];
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    filename: row.filename,
    subject: row.subject,
    gradeLevel: row.grade_level,
    standardCodes: row.standard_codes ?? [],
    vectorScore: row.vector_score ?? 0,
    keywordScore: row.keyword_score ?? 0,
    hybridScore: row.hybrid_score ?? 0,
  }));
}

function lexicalOverlapScore(query: string, text: string): number {
  const normalize = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const queryTerms = normalize(query);
  const textTerms = new Set(normalize(text));
  if (queryTerms.length === 0) return 0;

  const matches = queryTerms.filter(term => textTerms.has(term)).length;
  return matches / queryTerms.length;
}

async function scoreWithCrossEncoder(query: string, passage: string): Promise<number> {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) {
    return lexicalOverlapScore(query, passage);
  }

  const model = process.env.HUGGINGFACE_CROSS_ENCODER_MODEL ?? DEFAULT_CROSS_ENCODER_MODEL;
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        text: query,
        text_pair: passage,
      },
      options: {
        wait_for_model: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cross-encoder request failed (${response.status}): ${error}`);
  }

  const data = await response.json() as Array<{ score: number }> | { score: number };

  if (Array.isArray(data)) {
    return Math.max(...data.map(item => item.score ?? 0), 0);
  }

  return data.score ?? 0;
}

export async function rerankHybridResults(query: string, candidates: HybridSearchResult[], topK: number): Promise<HybridSearchResult[]> {
  if (candidates.length === 0) return [];

  const rescored = await Promise.all(candidates.map(async (candidate) => {
    let crossEncoderScore = 0;
    try {
      crossEncoderScore = await scoreWithCrossEncoder(query, candidate.text);
    } catch (error) {
      logger.warn('Cross-encoder rerank failed, falling back to lexical overlap', { error });
      crossEncoderScore = lexicalOverlapScore(query, candidate.text);
    }

    const finalScore = (crossEncoderScore * 0.65) + (candidate.hybridScore * 0.35);
    return {
      ...candidate,
      hybridScore: finalScore,
    };
  }));

  return rescored
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}

export async function searchCurriculumHybrid(
  query: string,
  embedding: number[],
  options: { subject?: string; gradeLevel?: number; topK?: number } = {},
): Promise<HybridSearchResult[]> {
  const topK = options.topK ?? 5;

  const candidates = await callHybridRpc(query, embedding, {
    subject: options.subject,
    gradeLevel: options.gradeLevel,
    topK,
  });

  const ranked = await rerankHybridResults(query, candidates, topK);
  logger.debug('Hybrid curriculum search results', {
    candidates: candidates.length,
    ranked: ranked.length,
  });

  return ranked;
}
