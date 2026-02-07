import { describe, it, expect, beforeEach } from 'vitest';
import { useRegulationStore } from '../regulation-store';

describe('regulationStore', () => {
  beforeEach(() => {
    useRegulationStore.getState().reset();
  });

  it('initializes with default values', () => {
    const state = useRegulationStore.getState();
    expect(state.level).toBe(75);
    expect(state.signals).toEqual([]);
    expect(state.interventionActive).toBe(false);
    expect(state.interventionCount).toBe(0);
  });

  describe('setLevel', () => {
    it('updates the regulation level', () => {
      useRegulationStore.getState().setLevel(50);
      expect(useRegulationStore.getState().level).toBe(50);
    });

    it('updates lastCheck timestamp', () => {
      const before = new Date();
      useRegulationStore.getState().setLevel(50);
      const after = new Date();
      const lastCheck = useRegulationStore.getState().lastCheck;
      expect(lastCheck.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastCheck.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('addSignal', () => {
    it('adds a signal to the list', () => {
      useRegulationStore.getState().addSignal('negative_self_talk');
      expect(useRegulationStore.getState().signals).toEqual(['negative_self_talk']);
    });

    it('decreases regulation level by 10', () => {
      useRegulationStore.getState().setLevel(75);
      useRegulationStore.getState().addSignal('rapid_short_responses');
      expect(useRegulationStore.getState().level).toBe(65);
    });

    it('does not go below 0', () => {
      useRegulationStore.getState().setLevel(5);
      useRegulationStore.getState().addSignal('all_caps');
      expect(useRegulationStore.getState().level).toBe(0);
    });

    it('accumulates multiple signals', () => {
      useRegulationStore.getState().addSignal('signal_a');
      useRegulationStore.getState().addSignal('signal_b');
      expect(useRegulationStore.getState().signals).toEqual(['signal_a', 'signal_b']);
    });
  });

  describe('triggerIntervention', () => {
    it('sets interventionActive to true', () => {
      useRegulationStore.getState().triggerIntervention();
      expect(useRegulationStore.getState().interventionActive).toBe(true);
    });

    it('increments interventionCount', () => {
      useRegulationStore.getState().triggerIntervention();
      useRegulationStore.getState().triggerIntervention();
      expect(useRegulationStore.getState().interventionCount).toBe(2);
    });
  });

  describe('dismissIntervention', () => {
    it('sets interventionActive to false', () => {
      useRegulationStore.getState().triggerIntervention();
      useRegulationStore.getState().dismissIntervention();
      expect(useRegulationStore.getState().interventionActive).toBe(false);
    });
  });

  describe('reset', () => {
    it('restores all values to defaults', () => {
      useRegulationStore.getState().setLevel(10);
      useRegulationStore.getState().addSignal('test');
      useRegulationStore.getState().triggerIntervention();
      useRegulationStore.getState().reset();

      const state = useRegulationStore.getState();
      expect(state.level).toBe(75);
      expect(state.signals).toEqual([]);
      expect(state.interventionActive).toBe(false);
      expect(state.interventionCount).toBe(0);
    });
  });
});
