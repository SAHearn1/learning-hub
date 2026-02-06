import type { BloomsLevel } from './curriculum';

export interface AssessmentResult {
  id: string;
  standardId: string;
  bloomsLevel: BloomsLevel;
  difficulty: number;
  question: string;
  studentResponse: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
}

export interface ThinkingQualityScores {
  reasoningArticulation: number; // 1-4
  assumptionAwareness: number;
  evidenceEvaluation: number;
  alternativePerspectives: number;
  conclusionJustification: number;
  metacognitiveAwareness: number;
}

export interface CreativityScores {
  fluency: number; // 1-4
  flexibility: number;
  originality: number;
  elaboration: number;
  riskTaking: number;
}
