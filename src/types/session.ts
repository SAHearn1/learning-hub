import type { FiveRPhase, RegulationState } from './five-rs';

export type EngagementMode =
  | 'FORWARD'
  | 'REVERSE'
  | 'ERROR_ANALYSIS'
  | 'MULTIPLE_PATHWAYS'
  | 'PROBLEM_POSING';

export type SubjectType = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS';

export interface SessionMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  sessionId: string;
  studentId: string;
  subject: SubjectType;
  currentPhase: FiveRPhase;
  engagementMode: EngagementMode;
  regulationState: RegulationState;
}
