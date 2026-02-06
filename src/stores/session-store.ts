import { create } from 'zustand';

type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';
type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS';

interface SessionMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  timestamp: Date;
}

interface SessionStore {
  sessionId: string | null;
  subject: Subject | null;
  currentPhase: FiveRPhase;
  engagementMode: EngagementMode;
  messages: SessionMessage[];
  isLoading: boolean;
  isStreaming: boolean;

  startSession: (sessionId: string, subject: Subject) => void;
  setPhase: (phase: FiveRPhase) => void;
  setEngagementMode: (mode: EngagementMode) => void;
  addMessage: (message: SessionMessage) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  subject: null,
  currentPhase: 'ROOT',
  engagementMode: 'FORWARD',
  messages: [],
  isLoading: false,
  isStreaming: false,

  startSession: (sessionId, subject) => set({
    sessionId,
    subject,
    currentPhase: 'ROOT',
    messages: [],
    isLoading: false,
  }),

  setPhase: (phase) => set({ currentPhase: phase }),
  setEngagementMode: (mode) => set({ engagementMode: mode }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  endSession: () => set({
    sessionId: null,
    subject: null,
    currentPhase: 'ROOT',
    messages: [],
    isLoading: false,
    isStreaming: false,
  }),
}));
