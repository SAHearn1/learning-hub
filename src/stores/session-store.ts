import { create } from 'zustand';

type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';
type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';

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
  streamingMessageId: string | null;

  startSession: (sessionId: string, subject: Subject) => void;
  hydrateSession: (session: {
    sessionId: string;
    subject: Subject;
    currentPhase: FiveRPhase;
    engagementMode: EngagementMode;
    messages: SessionMessage[];
  }) => void;
  setPhase: (phase: FiveRPhase) => void;
  setEngagementMode: (mode: EngagementMode) => void;
  addMessage: (message: SessionMessage) => void;
  appendToStreamingMessage: (text: string) => void;
  startStreamingMessage: (id: string) => void;
  finishStreamingMessage: () => void;
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
  streamingMessageId: null,

  startSession: (sessionId, subject) => set({
    sessionId,
    subject,
    currentPhase: 'ROOT',
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingMessageId: null,
  }),

  hydrateSession: (session) => set({
    sessionId: session.sessionId,
    subject: session.subject,
    currentPhase: session.currentPhase,
    engagementMode: session.engagementMode,
    messages: session.messages,
    isLoading: false,
    isStreaming: false,
    streamingMessageId: null,
  }),

  setPhase: (phase) => set({ currentPhase: phase }),
  setEngagementMode: (mode) => set({ engagementMode: mode }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  startStreamingMessage: (id) => set((state) => ({
    streamingMessageId: id,
    isStreaming: true,
    messages: [
      ...state.messages,
      { id, role: 'ASSISTANT', content: '', timestamp: new Date() },
    ],
  })),

  appendToStreamingMessage: (text) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === state.streamingMessageId
        ? { ...msg, content: msg.content + text }
        : msg
    ),
  })),

  finishStreamingMessage: () => set({
    streamingMessageId: null,
    isStreaming: false,
  }),

  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  endSession: () => set({
    sessionId: null,
    subject: null,
    currentPhase: 'ROOT',
    engagementMode: 'FORWARD',
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingMessageId: null,
  }),
}));
