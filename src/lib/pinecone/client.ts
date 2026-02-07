import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set');
    }

    pineconeClient = new Pinecone({
      apiKey,
    });
  }

  return pineconeClient;
}

export async function queryPinecone(
  embedding: number[],
  topK: number = 5,
  filter?: Record<string, any>
) {
  try {
    const client = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME is not set');
    }

    const index = client.index(indexName);

    const queryResponse = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,
    });

    return queryResponse.matches || [];
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw error;
  }
}

export async function upsertToPinecone(
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>
) {
  try {
    const client = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME is not set');
    }

    const index = client.index(indexName);

    // Pinecone SDK v2 expects records array in an object
    // TODO: Import proper types from @pinecone-database/pinecone instead of using 'as any'
    await index.upsert({
      records: vectors.map(v => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata || {},
      }))
    } as any);

    return true;
  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
    throw error;
  }
}
