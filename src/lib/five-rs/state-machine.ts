import type { FiveRPhase } from '@prisma/client';

const FIVE_R_SEQUENCE: readonly FiveRPhase[] = ['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT'];

interface SentimentResult {
  label: 'negative' | 'neutral' | 'positive';
  score: number;
}

interface TransitionContext {
  regulationLevel: number;
  sentiment: SentimentResult;
}

export interface FiveRStateSnapshot {
  currentPhase: FiveRPhase;
  phaseHistory: Array<{ phase: FiveRPhase; timestamp: string; reason: string }>;
  sentiment: SentimentResult;
  regulationPassed: boolean;
  updatedAt: string;
}

function getNextSequentialPhase(phase: FiveRPhase): FiveRPhase {
  const index = FIVE_R_SEQUENCE.indexOf(phase);
  if (index < 0 || index === FIVE_R_SEQUENCE.length - 1) {
    return phase;
  }
  return FIVE_R_SEQUENCE[index + 1];
}

export function canTransition(from: FiveRPhase, to: FiveRPhase, context: TransitionContext): boolean {
  if (from === to) return true;
  if (to !== getNextSequentialPhase(from)) return false;

  if (from === 'REGULATE' && to === 'REFLECT') {
    return context.regulationLevel >= 65 && context.sentiment.score >= -0.1;
  }

  return true;
}

export function computePhaseTransition(currentPhase: FiveRPhase, context: TransitionContext): FiveRPhase {
  const desiredNext = getNextSequentialPhase(currentPhase);
  if (desiredNext === currentPhase) return currentPhase;

  if (canTransition(currentPhase, desiredNext, context)) {
    return desiredNext;
  }

  return currentPhase;
}

export function buildFiveRStateSnapshot(params: {
  currentPhase: FiveRPhase;
  nextPhase: FiveRPhase;
  previousHistory: FiveRStateSnapshot['phaseHistory'];
  sentiment: SentimentResult;
  regulationLevel: number;
  timestamp?: Date;
}): FiveRStateSnapshot {
  const now = (params.timestamp ?? new Date()).toISOString();
  const transitioned = params.currentPhase !== params.nextPhase;

  const phaseHistory = transitioned
    ? [
        ...params.previousHistory,
        {
          phase: params.nextPhase,
          timestamp: now,
          reason:
            params.currentPhase === 'REGULATE' && params.nextPhase === 'REFLECT'
              ? 'Regulation baseline confirmed by sentiment analysis.'
              : `Sequential transition ${params.currentPhase} -> ${params.nextPhase}`,
        },
      ]
    : params.previousHistory;

  return {
    currentPhase: params.nextPhase,
    phaseHistory,
    sentiment: params.sentiment,
    regulationPassed: params.regulationLevel >= 65 && params.sentiment.score >= -0.1,
    updatedAt: now,
  };
}

export type { SentimentResult };
