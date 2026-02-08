import OpenAI from 'openai';
import { logger } from '@/lib/logger';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

let openaiClient: OpenAI | null = null;
const embeddingCache = new Map<string, number[]>();

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate an embedding vector for a single text input.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();

  const cleaned = text.replace(/\n+/g, ' ').trim();
  if (!cleaned) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const cacheKey = `${EMBEDDING_MODEL}:${hashText(cleaned)}`;
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleaned,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0].embedding;
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch.
 * OpenAI supports up to 2048 inputs per request.
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = getOpenAI();

  const cleaned = texts.map(t => t.replace(/\n+/g, ' ').trim());
  if (cleaned.every(t => t.length === 0)) {
    return [];
  }

  const results: number[][] = new Array(cleaned.length);
  const uncached: { index: number; text: string; cacheKey: string }[] = [];

  cleaned.forEach((text, index) => {
    if (!text) {
      results[index] = new Array(EMBEDDING_DIMENSIONS).fill(0);
      return;
    }
    const cacheKey = `${EMBEDDING_MODEL}:${hashText(text)}`;
    const cached = embeddingCache.get(cacheKey);
    if (cached) {
      results[index] = cached;
      return;
    }
    uncached.push({ index, text, cacheKey });
  });

  if (uncached.length === 0) {
    return results;
  }

  // Process in batches of 100 to stay well within limits
  const batchSize = 100;

  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch.map(item => item.text),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const sorted = response.data.sort((a, b) => a.index - b.index);
    sorted.forEach((entry, batchIndex) => {
      const target = batch[batchIndex];
      embeddingCache.set(target.cacheKey, entry.embedding);
      results[target.index] = entry.embedding;
    });

    if (i + batchSize < uncached.length) {
      logger.debug('Embedding batch progress', {
        processed: i + batch.length,
        total: uncached.length,
      });
    }
  }

  return results;
}

/**
 * Chunk text into segments of approximately `maxTokens` tokens.
 * Uses a simple heuristic: 1 token ~ 4 characters.
 * Splits on paragraph boundaries with overlap.
 */
export function chunkText(
  text: string,
  maxTokens: number = 512,
  overlapTokens: number = 50,
): string[] {
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  // Split on double newlines (paragraphs)
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // If a single paragraph exceeds max, split by sentences
    if (trimmed.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      let sentenceBuffer = '';
      for (const sentence of sentences) {
        if ((sentenceBuffer + ' ' + sentence).length > maxChars && sentenceBuffer) {
          chunks.push(sentenceBuffer.trim());
          // Keep overlap from end of previous chunk
          const words = sentenceBuffer.split(' ');
          const overlapWords = words.slice(-Math.ceil(overlapChars / 5));
          sentenceBuffer = overlapWords.join(' ') + ' ' + sentence;
        } else {
          sentenceBuffer = sentenceBuffer ? sentenceBuffer + ' ' + sentence : sentence;
        }
      }
      if (sentenceBuffer) {
        current = sentenceBuffer;
      }
      continue;
    }

    if ((current + '\n\n' + trimmed).length > maxChars && current) {
      chunks.push(current.trim());
      // Keep overlap from end of previous chunk
      const words = current.split(' ');
      const overlapWords = words.slice(-Math.ceil(overlapChars / 5));
      current = overlapWords.join(' ') + '\n\n' + trimmed;
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * Parse markdown content, splitting on headers.
 */
export function chunkMarkdown(markdown: string, maxTokens: number = 512): string[] {
  // Split on ## headers (keep the header with its content)
  const sections = markdown.split(/(?=^## )/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxTokens * 4) {
      // Section too large, chunk it further
      chunks.push(...chunkText(trimmed, maxTokens));
    } else {
      chunks.push(trimmed);
    }
  }

  return chunks.length > 0 ? chunks : chunkText(markdown, maxTokens);
}

/**
 * Parse JSON content into individual chunks.
 * Each top-level array element or object key becomes a chunk.
 */
export function chunkJSON(jsonString: string, maxTokens: number = 512): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    // Fall back to text chunking if JSON is invalid
    return chunkText(jsonString, maxTokens);
  }

  const chunks: string[] = [];

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const text = JSON.stringify(item, null, 2);
      if (text.length > maxTokens * 4) {
        chunks.push(...chunkText(text, maxTokens));
      } else {
        chunks.push(text);
      }
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    for (const [key, value] of Object.entries(parsed)) {
      const text = `${key}: ${JSON.stringify(value, null, 2)}`;
      if (text.length > maxTokens * 4) {
        chunks.push(...chunkText(text, maxTokens));
      } else {
        chunks.push(text);
      }
    }
  } else {
    chunks.push(String(parsed));
  }

  return chunks.length > 0 ? chunks : [jsonString];
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
