import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Generate semantic embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Defensive trimming — embeddings models have very high limits,
  // but chunking should already keep this small.
  const input = trimmed.slice(0, 8192);

  try {
    const response = await getOpenAIClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Batch embedding generation
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const input = texts
    .map(t => t.trim().slice(0, 8192))
    .filter(Boolean);

  if (input.length === 0) {
    throw new Error('Cannot generate embeddings for empty text inputs');
  }

  try {
    const response = await getOpenAIClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });

    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Batch embedding generation failed:', error);
    throw error;
  }
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

  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

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
  const sections = markdown.split(/(?=^## )/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxTokens * 4) {
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
