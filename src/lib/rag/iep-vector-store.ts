// =================================================================
// IEP Vector Store Manager
// Manages the IEP-specific namespace in Pinecone for secure,
// FERPA-compliant storage and retrieval of IEP document embeddings.
// =================================================================

import { getPineconeClient } from '@/lib/pinecone/client';
import { generateEmbedding } from '@/lib/pinecone/embeddings';
import type { IepChunk, IepContextResult, IepSectionType } from './types';

/**
 * Pinecone namespace dedicated to IEP documents.
 * Keeps IEP data isolated from curriculum content vectors.
 */
const IEP_NAMESPACE = 'iep-documents';

/**
 * Maximum batch size for Pinecone upsert operations.
 * Pinecone recommends batches of 100 or fewer vectors.
 */
const UPSERT_BATCH_SIZE = 100;

/**
 * Indexes IEP document chunks into Pinecone with generated embeddings.
 * Uses the dedicated `iep-documents` namespace to isolate IEP data
 * from curriculum vectors.
 *
 * @param studentId - The student's unique identifier (used for metadata filtering)
 * @param chunks - The IEP chunks to embed and store
 */
export async function indexIepDocument(
  studentId: string,
  chunks: IepChunk[],
): Promise<void> {
  if (chunks.length === 0) return;

  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME is not set');
  }

  const index = client.index(indexName).namespace(IEP_NAMESPACE);

  // Generate embeddings for all chunks
  const embeddings = await Promise.all(
    chunks.map((chunk) => generateEmbedding(chunk.content)),
  );

  // Build Pinecone vector records
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      studentId: chunk.metadata.studentId,
      documentId: chunk.metadata.documentId,
      sectionType: chunk.metadata.sectionType,
      chunkIndex: chunk.metadata.chunkIndex,
      totalChunks: chunk.metadata.totalChunks,
      gradeLevel: chunk.metadata.gradeLevel,
      lastUpdated: chunk.metadata.lastUpdated,
      content: chunk.content,
      ...(chunk.metadata.accommodationType
        ? { accommodationType: chunk.metadata.accommodationType }
        : {}),
    },
  }));

  // Upsert in batches to respect Pinecone limits
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
    await index.upsert({ records: batch });
  }

  console.log(
    `IEP Vector Store: Indexed ${chunks.length} chunks for student ${studentId} in namespace '${IEP_NAMESPACE}'`,
  );
}

/**
 * Queries the IEP vector store for relevant context matching a query.
 * Enforces student data isolation by always filtering on studentId,
 * ensuring a student can only retrieve their own IEP data.
 *
 * @param studentId - The student whose IEP data to search
 * @param query - The search query text
 * @param topK - Maximum number of results to return (default: 5)
 * @returns Ranked array of relevant IEP context results
 */
export async function queryIepContext(
  studentId: string,
  query: string,
  topK: number = 5,
): Promise<IepContextResult[]> {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME is not set');
  }

  const index = client.index(indexName).namespace(IEP_NAMESPACE);

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Query with mandatory studentId filter for data isolation
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: {
      studentId: { $eq: studentId },
    },
  });

  const matches = queryResponse.matches || [];

  return matches.map((match) => {
    const metadata = (match.metadata as Record<string, unknown>) || {};
    return {
      content: (metadata.content as string) || '',
      sectionType: (metadata.sectionType as IepSectionType) || 'general',
      relevanceScore: match.score ?? 0,
      metadata,
    };
  });
}

/**
 * Queries IEP context filtered by specific section types.
 * Useful for retrieving only accommodations or goals, for example.
 *
 * @param studentId - The student whose IEP data to search
 * @param query - The search query text
 * @param sectionTypes - Section types to filter by
 * @param topK - Maximum number of results to return (default: 5)
 * @returns Ranked array of relevant IEP context results
 */
export async function queryIepContextBySection(
  studentId: string,
  query: string,
  sectionTypes: IepSectionType[],
  topK: number = 5,
): Promise<IepContextResult[]> {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME is not set');
  }

  const index = client.index(indexName).namespace(IEP_NAMESPACE);
  const queryEmbedding = await generateEmbedding(query);

  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: {
      studentId: { $eq: studentId },
      sectionType: { $in: sectionTypes },
    },
  });

  const matches = queryResponse.matches || [];

  return matches.map((match) => {
    const metadata = (match.metadata as Record<string, unknown>) || {};
    return {
      content: (metadata.content as string) || '',
      sectionType: (metadata.sectionType as IepSectionType) || 'general',
      relevanceScore: match.score ?? 0,
      metadata,
    };
  });
}

/**
 * Removes all IEP data for a specific student from Pinecone.
 * This is required for FERPA compliance when a student's data
 * needs to be deleted (e.g., upon request, transfer, or graduation).
 *
 * @param studentId - The student whose IEP data should be deleted
 */
export async function removeStudentIepData(studentId: string): Promise<void> {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME is not set');
  }

  const index = client.index(indexName).namespace(IEP_NAMESPACE);

  // Delete all vectors matching this student's ID using metadata filter
  await index.deleteMany({
    filter: {
      studentId: { $eq: studentId },
    },
  });

  console.log(
    `IEP Vector Store: Removed all IEP data for student ${studentId} from namespace '${IEP_NAMESPACE}'`,
  );
}

/**
 * Removes a specific IEP document's data from Pinecone.
 * Useful when a document is superseded by an updated version.
 *
 * @param studentId - The student's identifier
 * @param documentId - The specific document to remove
 */
export async function removeIepDocument(
  studentId: string,
  documentId: string,
): Promise<void> {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME is not set');
  }

  const index = client.index(indexName).namespace(IEP_NAMESPACE);

  await index.deleteMany({
    filter: {
      studentId: { $eq: studentId },
      documentId: { $eq: documentId },
    },
  });

  console.log(
    `IEP Vector Store: Removed document ${documentId} for student ${studentId}`,
  );
}
