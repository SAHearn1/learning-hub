import type { FiveRPhase } from '@prisma/client';

interface TransitionInput {
  currentPhase: FiveRPhase;
  regulationLevel: number;
  hasErrorSignal: boolean;
  sessionMessageCount: number;
}

interface TransitionResult {
  nextPhase: FiveRPhase;
  reason: string;
}

export function getRecommendedPhaseTransition(input: TransitionInput): TransitionResult | null {
  const { currentPhase, regulationLevel, hasErrorSignal, sessionMessageCount } = input;

  if (regulationLevel < 40 && currentPhase !== 'REGULATE') {
    return { nextPhase: 'REGULATE', reason: 'Dysregulation detected, shifting to regulation support.' };
  }

  if (currentPhase === 'ROOT' && regulationLevel >= 60 && sessionMessageCount >= 2) {
    return { nextPhase: 'REFLECT', reason: 'Learner is ready to engage in active reflection.' };
  }

  if (currentPhase === 'REGULATE' && regulationLevel >= 60) {
    return { nextPhase: 'REFLECT', reason: 'Regulation recovered, returning to learning flow.' };
  }

  if (currentPhase === 'REFLECT' && hasErrorSignal) {
    return { nextPhase: 'RESTORE', reason: 'Detected misconceptions, moving into restore mode.' };
  }

  if (currentPhase === 'RESTORE' && !hasErrorSignal && regulationLevel >= 50) {
    return { nextPhase: 'RECONNECT', reason: 'Error addressed, applying understanding in reconnect phase.' };
  }

  return null;
}
