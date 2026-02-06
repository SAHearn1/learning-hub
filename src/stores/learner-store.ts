import { create } from 'zustand';
import type { LearningPreferences } from '@/types/learner';

interface LearnerStore {
  studentId: string | null;
  gradeLevel: number;
  preferences: LearningPreferences;
  accommodations: string[];

  setStudent: (studentId: string, gradeLevel: number) => void;
  updatePreferences: (prefs: Partial<LearningPreferences>) => void;
  setAccommodations: (accommodations: string[]) => void;
}

export const useLearnerStore = create<LearnerStore>((set) => ({
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

  setStudent: (studentId, gradeLevel) => set({ studentId, gradeLevel }),

  updatePreferences: (prefs) => set((state) => ({
    preferences: { ...state.preferences, ...prefs },
  })),

  setAccommodations: (accommodations) => set({ accommodations }),
}));
