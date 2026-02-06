import { create } from 'zustand';

interface ProgressEntry {
  standardId: string;
  standardCode: string;
  masteryLevel: number;
  assessmentCount: number;
  lastAssessedAt: Date | null;
}

interface ProgressStore {
  entries: ProgressEntry[];
  isLoading: boolean;

  setEntries: (entries: ProgressEntry[]) => void;
  updateEntry: (standardId: string, update: Partial<ProgressEntry>) => void;
  setLoading: (loading: boolean) => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  entries: [],
  isLoading: false,

  setEntries: (entries) => set({ entries }),

  updateEntry: (standardId, update) => set((state) => ({
    entries: state.entries.map((e) =>
      e.standardId === standardId ? { ...e, ...update } : e
    ),
  })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
