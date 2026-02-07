import { anthropic } from '@/lib/ai/client';

/**
 * Generate embeddings for text using Claude's API
 * Note: Claude doesn't have a native embeddings endpoint, so we use a workaround
 * In production, consider using a dedicated embeddings model like OpenAI's text-embedding-3-small
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // For now, we'll return a placeholder.
    // In production, integrate with OpenAI's embeddings API or another embeddings service
    // Example with OpenAI:
    // const response = await openai.embeddings.create({
    //   model: "text-embedding-3-small",
    //   input: text,
    // });
    // return response.data[0].embedding;
    
    // Placeholder: Generate a simple embedding based on text characteristics
    // This should be replaced with actual embedding generation
    const embedding = new Array(1536).fill(0).map((_, i) => {
      return Math.sin(i * text.length) * 0.1 + Math.cos(i * text.charCodeAt(i % text.length)) * 0.1;
    });
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
  return embeddings;
}
