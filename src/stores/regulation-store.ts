import { create } from 'zustand';

interface RegulationStore {
  level: number;
  signals: string[];
  lastCheck: Date;
  interventionActive: boolean;
  interventionCount: number;

  setLevel: (level: number) => void;
  addSignal: (signal: string) => void;
  triggerIntervention: () => void;
  dismissIntervention: () => void;
  reset: () => void;
}

export const useRegulationStore = create<RegulationStore>((set) => ({
  level: 75,
  signals: [],
  lastCheck: new Date(),
  interventionActive: false,
  interventionCount: 0,

  setLevel: (level) => set({ level, lastCheck: new Date() }),

  addSignal: (signal) => set((state) => ({
    signals: [...state.signals, signal],
    level: Math.max(0, state.level - 10),
  })),

  triggerIntervention: () => set((state) => ({
    interventionActive: true,
    interventionCount: state.interventionCount + 1,
  })),

  dismissIntervention: () => set({ interventionActive: false }),

  reset: () => set({
    level: 75,
    signals: [],
    lastCheck: new Date(),
    interventionActive: false,
    interventionCount: 0,
  }),
}));
