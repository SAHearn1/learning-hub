// =================================================================
// RAG Pipeline Types for IEP Context Window Management
// =================================================================

export interface IepDocument {
  studentId: string;
  documentId: string;
  content: string;
  sections: IepSection[];
  metadata: {
    gradeLevel: number;
    lastUpdated: Date;
    school: string;
    caseManager: string;
  };
}

export interface IepSection {
  type: IepSectionType;
  title: string;
  content: string;
}

export type IepSectionType =
  | 'present_levels'
  | 'annual_goals'
  | 'short_term_objectives'
  | 'accommodations'
  | 'modifications'
  | 'related_services'
  | 'transition_plan'
  | 'behavior_plan'
  | 'assessment_accommodations'
  | 'general';

export interface IepChunk {
  id: string;
  content: string;
  sectionType: IepSectionType;
  metadata: {
    studentId: string;
    documentId: string;
    sectionType: IepSectionType;
    chunkIndex: number;
    totalChunks: number;
    gradeLevel: number;
    lastUpdated: string;
    accommodationType?: string;
  };
}

export interface IepContextResult {
  content: string;
  sectionType: IepSectionType;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

export interface ContextBuildParams {
  studentId: string;
  query: string;
  sessionPhase: string;
  subject: string;
  gradeLevel: number;
  accommodations: string[];
  sessionHistory: string;
  maxTokens?: number;
}

export interface OptimizedContext {
  iepContext: string;
  curriculumContext: string;
  sessionSummary: string;
  totalTokensUsed: number;
  tokenBreakdown: {
    iep: number;
    curriculum: number;
    sessionHistory: number;
  };
  retrievalMetrics: {
    iepChunksRetrieved: number;
    curriculumChunksRetrieved: number;
    retrievalTimeMs: number;
  };
}

export interface IepMetadata {
  gradeLevel: number;
  school: string;
  caseManager: string;
  lastUpdated?: Date;
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  processingTimeMs: number;
  sections: {
    type: IepSectionType;
    chunkCount: number;
  }[];
}
