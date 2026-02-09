// =================================================================
// IEP Ingestion Helper
// Server-side helper for parsing, processing, and indexing IEP
// documents into the vector store.
// =================================================================

import { processIepDocument, parseIepSections } from './iep-document-processor';
import { indexIepDocument, removeIepDocument } from './iep-vector-store';
import type {
  IepDocument,
  IepMetadata,
  IepSection,
  IepSectionType,
  IngestResult,
} from './types';

/**
 * Ingests a raw IEP document for a student: parses the text into sections,
 * processes sections into chunks, generates embeddings, and stores them
 * in the vector database.
 *
 * @param studentId - The student this IEP belongs to
 * @param rawContent - The raw text content of the IEP document
 * @param metadata - Document metadata (grade level, school, case manager)
 * @returns Ingestion metrics including chunk counts and processing time
 */
export async function ingestIepDocument(
  studentId: string,
  rawContent: string,
  metadata: IepMetadata,
): Promise<IngestResult> {
  const startTime = Date.now();

  // Generate a unique document ID
  const documentId = generateDocumentId(studentId);

  // Parse raw content into structured IEP sections
  const sections: IepSection[] = parseIepSections(rawContent);

  // Build the structured IEP document
  const document: IepDocument = {
    studentId,
    documentId,
    content: rawContent,
    sections,
    metadata: {
      gradeLevel: metadata.gradeLevel,
      lastUpdated: metadata.lastUpdated ?? new Date(),
      school: metadata.school,
      caseManager: metadata.caseManager,
    },
  };

  // Process into chunks
  const chunks = processIepDocument(document);

  if (chunks.length === 0) {
    return {
      documentId,
      chunksCreated: 0,
      processingTimeMs: Date.now() - startTime,
      sections: [],
    };
  }

  // Remove any existing document data for this student/document before re-indexing
  // This ensures we don't accumulate stale chunks from previous versions
  try {
    await removeIepDocument(studentId, documentId);
  } catch {
    // Ignore errors when removing (document may not exist yet)
  }

  // Index the new chunks into Pinecone
  await indexIepDocument(studentId, chunks);

  // Compute per-section statistics
  const sectionCounts = new Map<IepSectionType, number>();
  for (const chunk of chunks) {
    const current = sectionCounts.get(chunk.sectionType) ?? 0;
    sectionCounts.set(chunk.sectionType, current + 1);
  }

  const sectionStats = Array.from(sectionCounts.entries()).map(
    ([type, chunkCount]) => ({
      type,
      chunkCount,
    }),
  );

  const processingTimeMs = Date.now() - startTime;

  console.log(
    `IEP Ingest: Processed ${chunks.length} chunks across ${sections.length} sections ` +
      `for student ${studentId} in ${processingTimeMs}ms`,
  );

  return {
    documentId,
    chunksCreated: chunks.length,
    processingTimeMs,
    sections: sectionStats,
  };
}

/**
 * Re-ingests an IEP document, replacing any previously stored data.
 * Useful when an IEP is updated or amended.
 *
 * @param studentId - The student this IEP belongs to
 * @param rawContent - The updated raw text content
 * @param metadata - Updated document metadata
 * @param existingDocumentId - Optional: the ID of the document to replace
 * @returns Ingestion metrics
 */
export async function reingestIepDocument(
  studentId: string,
  rawContent: string,
  metadata: IepMetadata,
  existingDocumentId?: string,
): Promise<IngestResult> {
  // Remove existing document data if specified
  if (existingDocumentId) {
    try {
      await removeIepDocument(studentId, existingDocumentId);
    } catch (error) {
      console.error(
        `Failed to remove existing document ${existingDocumentId}:`,
        error,
      );
    }
  }

  return ingestIepDocument(studentId, rawContent, metadata);
}

/**
 * Generates a unique document ID for an IEP document.
 * Uses the student ID and timestamp to ensure uniqueness.
 */
function generateDocumentId(studentId: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `iep_doc_${studentId}_${timestamp}_${randomSuffix}`;
}
