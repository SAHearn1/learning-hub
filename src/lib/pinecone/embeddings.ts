import { generateEmbedding as generateEmbeddingFromLib, generateEmbeddings as generateEmbeddingsFromLib } from '@/lib/embeddings';

/**
 * Generate embeddings for text using OpenAI's API
 * 
 * This is a wrapper around the production-ready embedding implementation
 * from @/lib/embeddings which uses OpenAI's text-embedding-3-small model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await generateEmbeddingFromLib(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * This is a wrapper around the production-ready batch embedding implementation
 * from @/lib/embeddings which processes texts in optimized batches.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    return await generateEmbeddingsFromLib(texts);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}
