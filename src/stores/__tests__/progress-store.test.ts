import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '../progress-store';

describe('progressStore', () => {
  beforeEach(() => {
    useProgressStore.setState({ entries: [], isLoading: false });
  });

  it('initializes with empty entries', () => {
    const state = useProgressStore.getState();
    expect(state.entries).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  describe('setEntries', () => {
    it('sets progress entries', () => {
      const entries = [
        {
          standardId: 'std-1',
          standardCode: 'MATH.6.NS.1',
          masteryLevel: 0.8,
          assessmentCount: 5,
          lastAssessedAt: new Date(),
        },
      ];
      useProgressStore.getState().setEntries(entries);
      expect(useProgressStore.getState().entries).toHaveLength(1);
      expect(useProgressStore.getState().entries[0].standardCode).toBe('MATH.6.NS.1');
    });
  });

  describe('updateEntry', () => {
    it('updates a specific entry by standardId', () => {
      useProgressStore.getState().setEntries([
        { standardId: 'a', standardCode: 'A', masteryLevel: 0.5, assessmentCount: 1, lastAssessedAt: null },
        { standardId: 'b', standardCode: 'B', masteryLevel: 0.3, assessmentCount: 2, lastAssessedAt: null },
      ]);

      useProgressStore.getState().updateEntry('a', { masteryLevel: 0.9 });
      const entries = useProgressStore.getState().entries;
      expect(entries[0].masteryLevel).toBe(0.9);
      expect(entries[1].masteryLevel).toBe(0.3); // unchanged
    });

    it('does nothing if standardId not found', () => {
      useProgressStore.getState().setEntries([
        { standardId: 'a', standardCode: 'A', masteryLevel: 0.5, assessmentCount: 1, lastAssessedAt: null },
      ]);
      useProgressStore.getState().updateEntry('nonexistent', { masteryLevel: 1.0 });
      expect(useProgressStore.getState().entries[0].masteryLevel).toBe(0.5);
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      useProgressStore.getState().setLoading(true);
      expect(useProgressStore.getState().isLoading).toBe(true);
      useProgressStore.getState().setLoading(false);
      expect(useProgressStore.getState().isLoading).toBe(false);
    });
  });
});
