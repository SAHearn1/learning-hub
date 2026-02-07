import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../session-store';

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().endSession();
  });

  it('initializes with null session', () => {
    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.subject).toBeNull();
    expect(state.currentPhase).toBe('ROOT');
    expect(state.engagementMode).toBe('FORWARD');
    expect(state.messages).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isStreaming).toBe(false);
  });

  describe('startSession', () => {
    it('sets sessionId and subject', () => {
      useSessionStore.getState().startSession('session-1', 'MATH');
      const state = useSessionStore.getState();
      expect(state.sessionId).toBe('session-1');
      expect(state.subject).toBe('MATH');
    });

    it('resets phase to ROOT', () => {
      useSessionStore.getState().setPhase('REFLECT');
      useSessionStore.getState().startSession('session-2', 'SCIENCE');
      expect(useSessionStore.getState().currentPhase).toBe('ROOT');
    });

    it('clears messages', () => {
      useSessionStore.getState().addMessage({
        id: '1', role: 'USER', content: 'test', timestamp: new Date(),
      });
      useSessionStore.getState().startSession('session-2', 'MATH');
      expect(useSessionStore.getState().messages).toEqual([]);
    });
  });

  describe('setPhase', () => {
    it('transitions to each Five R phase', () => {
      const phases = ['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT'] as const;
      for (const phase of phases) {
        useSessionStore.getState().setPhase(phase);
        expect(useSessionStore.getState().currentPhase).toBe(phase);
      }
    });
  });

  describe('setEngagementMode', () => {
    it('sets the engagement mode', () => {
      useSessionStore.getState().setEngagementMode('ERROR_ANALYSIS');
      expect(useSessionStore.getState().engagementMode).toBe('ERROR_ANALYSIS');
    });
  });

  describe('addMessage', () => {
    it('appends a message', () => {
      const msg = { id: '1', role: 'USER' as const, content: 'Hello', timestamp: new Date() };
      useSessionStore.getState().addMessage(msg);
      expect(useSessionStore.getState().messages).toHaveLength(1);
      expect(useSessionStore.getState().messages[0].content).toBe('Hello');
    });

    it('preserves message order', () => {
      useSessionStore.getState().addMessage({
        id: '1', role: 'USER', content: 'First', timestamp: new Date(),
      });
      useSessionStore.getState().addMessage({
        id: '2', role: 'ASSISTANT', content: 'Second', timestamp: new Date(),
      });
      const messages = useSessionStore.getState().messages;
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });
  });

  describe('setLoading / setStreaming', () => {
    it('toggles loading state', () => {
      useSessionStore.getState().setLoading(true);
      expect(useSessionStore.getState().isLoading).toBe(true);
      useSessionStore.getState().setLoading(false);
      expect(useSessionStore.getState().isLoading).toBe(false);
    });

    it('toggles streaming state', () => {
      useSessionStore.getState().setStreaming(true);
      expect(useSessionStore.getState().isStreaming).toBe(true);
    });
  });

  describe('endSession', () => {
    it('resets all session state', () => {
      useSessionStore.getState().startSession('s1', 'MATH');
      useSessionStore.getState().setPhase('REFLECT');
      useSessionStore.getState().addMessage({
        id: '1', role: 'USER', content: 'test', timestamp: new Date(),
      });
      useSessionStore.getState().setLoading(true);
      useSessionStore.getState().setStreaming(true);

      useSessionStore.getState().endSession();

      const state = useSessionStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.subject).toBeNull();
      expect(state.currentPhase).toBe('ROOT');
      expect(state.messages).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isStreaming).toBe(false);
    });
  });
});
