import { describe, it, expect, beforeEach } from 'vitest';
import { useLearnerStore } from '../learner-store';

describe('learnerStore', () => {
  beforeEach(() => {
    useLearnerStore.setState({
      studentId: null,
      gradeLevel: 6,
      preferences: {
        modalities: ['visual', 'reading'],
        pacing: 'moderate',
        scaffoldingLevel: 'medium',
        fontPreference: 'default',
        colorMode: 'default',
        reducedMotion: false,
      },
      accommodations: [],
    });
  });

  it('initializes with default values', () => {
    const state = useLearnerStore.getState();
    expect(state.studentId).toBeNull();
    expect(state.gradeLevel).toBe(6);
    expect(state.preferences.pacing).toBe('moderate');
    expect(state.accommodations).toEqual([]);
  });

  describe('setStudent', () => {
    it('sets studentId and gradeLevel', () => {
      useLearnerStore.getState().setStudent('student-123', 8);
      const state = useLearnerStore.getState();
      expect(state.studentId).toBe('student-123');
      expect(state.gradeLevel).toBe(8);
    });
  });

  describe('updatePreferences', () => {
    it('partially updates preferences', () => {
      useLearnerStore.getState().updatePreferences({ pacing: 'slow' });
      const state = useLearnerStore.getState();
      expect(state.preferences.pacing).toBe('slow');
      // Other preferences remain unchanged
      expect(state.preferences.scaffoldingLevel).toBe('medium');
    });

    it('updates font preference', () => {
      useLearnerStore.getState().updatePreferences({ fontPreference: 'dyslexic' });
      expect(useLearnerStore.getState().preferences.fontPreference).toBe('dyslexic');
    });

    it('updates reducedMotion', () => {
      useLearnerStore.getState().updatePreferences({ reducedMotion: true });
      expect(useLearnerStore.getState().preferences.reducedMotion).toBe(true);
    });
  });

  describe('setAccommodations', () => {
    it('sets accommodations array', () => {
      useLearnerStore.getState().setAccommodations(['extended-time', 'text-to-speech']);
      expect(useLearnerStore.getState().accommodations).toEqual([
        'extended-time',
        'text-to-speech',
      ]);
    });

    it('can clear accommodations', () => {
      useLearnerStore.getState().setAccommodations(['test']);
      useLearnerStore.getState().setAccommodations([]);
      expect(useLearnerStore.getState().accommodations).toEqual([]);
    });
  });
});
