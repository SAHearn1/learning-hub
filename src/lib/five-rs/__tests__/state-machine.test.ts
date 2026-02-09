import { describe, expect, it } from 'vitest';

import { buildFiveRStateSnapshot, canTransition, computePhaseTransition } from '../state-machine';

describe('five-rs state machine', () => {
  it('blocks REGULATE -> REFLECT when regulation baseline is not met', () => {
    expect(
      canTransition('REGULATE', 'REFLECT', {
        regulationLevel: 55,
        sentiment: { label: 'negative', score: -0.4 },
      })
    ).toBe(false);

    expect(
      computePhaseTransition('REGULATE', {
        regulationLevel: 55,
        sentiment: { label: 'negative', score: -0.4 },
      })
    ).toBe('REGULATE');
  });

  it('allows REGULATE -> REFLECT after regulation and sentiment pass', () => {
    expect(
      canTransition('REGULATE', 'REFLECT', {
        regulationLevel: 72,
        sentiment: { label: 'neutral', score: 0 },
      })
    ).toBe(true);

    expect(
      computePhaseTransition('REGULATE', {
        regulationLevel: 72,
        sentiment: { label: 'neutral', score: 0 },
      })
    ).toBe('REFLECT');
  });

  it('records phase history when transitions occur', () => {
    const snapshot = buildFiveRStateSnapshot({
      currentPhase: 'REGULATE',
      nextPhase: 'REFLECT',
      previousHistory: [],
      sentiment: { label: 'positive', score: 0.5 },
      regulationLevel: 75,
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(snapshot.phaseHistory).toHaveLength(1);
    expect(snapshot.phaseHistory[0]).toMatchObject({
      phase: 'REFLECT',
      reason: 'Regulation baseline confirmed by sentiment analysis.',
    });
    expect(snapshot.regulationPassed).toBe(true);
  });
});
