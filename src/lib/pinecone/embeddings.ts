import {
  generateEmbedding as generateOpenAIEmbedding,
  generateEmbeddings as generateOpenAIEmbeddings,
} from '@/lib/embeddings';

/**
 * Backward-compatible wrapper for Pinecone embedding calls.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateOpenAIEmbedding(text);
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return generateOpenAIEmbeddings(texts);
}
