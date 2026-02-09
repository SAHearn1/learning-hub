/**
 * Citation and Source Attribution Types
 * 
 * These types support the source citation system that displays
 * the exact curriculum content used to generate AI responses.
 */

/**
 * A single source citation from curriculum content
 */
export interface SourceCitation {
  /** Unique identifier for this citation */
  id: string;
  
  /** Source file path (e.g., "02-introduction/overview.md") */
  filename: string;
  
  /** Section or part name within the document */
  section?: string;
  
  /** Chunk index within the document */
  chunkIndex: number;
  
  /** Total chunks in the document */
  totalChunks: number;
  
  /** The actual text content that was retrieved */
  text: string;
  
  /** Pinecone similarity/relevance score (0-1) */
  relevanceScore: number;
  
  /** GitHub URL to the source file */
  sourceUrl: string;
  
  /** Subject area */
  subject: string;
  
  /** Grade level */
  gradeLevel: number;
  
  /** Standard codes covered */
  standardCodes: string[];
  
  /** Course name (e.g., "RootWork Framework") */
  course?: string;
  
  /** Module name (e.g., "Introduction") */
  module?: string;
}

/**
 * Metadata stored with chat messages
 */
export interface ChatMessageMetadata {
  /** Source citations for curriculum-based responses */
  citations?: SourceCitation[];
  
  /** Additional metadata fields can be added here */
  [key: string]: any;
}
