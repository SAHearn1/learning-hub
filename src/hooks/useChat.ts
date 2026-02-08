'use client';

import { useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useRegulationStore } from '@/stores/regulation-store';
import { detectDysregulation, detectTRACEStep, type TRACEStep } from '@/lib/regulation/detect-dysregulation';

interface UseChatReturn {
  sendMessage: (content: string) => Promise<void>;
  createSession: (subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS', mode?: string) => Promise<string | null>;
  endSession: () => Promise<void>;
  updatePhase: (phase: string) => Promise<void>;
  updateEngagementMode: (mode: string) => Promise<void>;
  detectTraceStep: () => TRACEStep;
}

export function useChat(): UseChatReturn {
  const abortRef = useRef<AbortController | null>(null);

  const sessionId = useSessionStore((s) => s.sessionId);
  const messages = useSessionStore((s) => s.messages);
  const currentPhase = useSessionStore((s) => s.currentPhase);
  const addMessage = useSessionStore((s) => s.addMessage);
  const startStreamingMessage = useSessionStore((s) => s.startStreamingMessage);
  const appendToStreamingMessage = useSessionStore((s) => s.appendToStreamingMessage);
  const finishStreamingMessage = useSessionStore((s) => s.finishStreamingMessage);
  const setLoading = useSessionStore((s) => s.setLoading);
  const startSession = useSessionStore((s) => s.startSession);
  const endSessionStore = useSessionStore((s) => s.endSession);
  const setPhase = useSessionStore((s) => s.setPhase);
  const setEngagementMode = useSessionStore((s) => s.setEngagementMode);

  const regulationLevel = useRegulationStore((s) => s.level);
  const addSignal = useRegulationStore((s) => s.addSignal);
  const triggerIntervention = useRegulationStore((s) => s.triggerIntervention);
  const setRegulationLevel = useRegulationStore((s) => s.setLevel);

  const updatePhaseInternal = useCallback(async (sid: string, phase: string) => {
    setPhase(phase as Parameters<typeof setPhase>[0]);
    try {
      await fetch(`/api/sessions/${sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPhase: phase }),
      });
    } catch {
      // Silently fail phase persistence -- local state is updated
    }
  }, [setPhase]);

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId || !content.trim()) return;

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    // Add user message
    const userMsgId = `msg-${Date.now()}-user`;
    addMessage({
      id: userMsgId,
      role: 'USER',
      content: content.trim(),
      timestamp: new Date(),
    });

    // Run dysregulation detection on the user message
    const analysis = detectDysregulation(
      content,
      messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    );

    if (analysis.signals.length > 0) {
      for (const signal of analysis.signals) {
        addSignal(signal.description);
      }

      if (analysis.shouldTriggerIntervention) {
        triggerIntervention();

        // If severe dysregulation and not already in REGULATE phase, transition
        if (currentPhase !== 'REGULATE' && regulationLevel - analysis.regulationDelta < 40) {
          await updatePhaseInternal(sessionId, 'REGULATE');
        }
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content.trim() }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Start streaming assistant message
      const assistantMsgId = `msg-${Date.now()}-assistant`;
      startStreamingMessage(assistantMsgId);
      setLoading(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.text) {
              appendToStreamingMessage(data.text);
            }
            if (data.done) {
              finishStreamingMessage();
            }
            if (data.phaseTransition?.to) {
              setPhase(data.phaseTransition.to as Parameters<typeof setPhase>[0]);
              addMessage({
                id: `msg-${Date.now()}-phase`,
                role: 'SYSTEM',
                content: `5Rs transition: ${data.phaseTransition.from} → ${data.phaseTransition.to}. ${data.phaseTransition.reason || ''}`.trim(),
                timestamp: new Date(),
              });
            }
            if (data.dysregulation) {
              if (typeof data.dysregulation.severity === 'string' && data.dysregulation.severity === 'high') {
                triggerIntervention();
              }
              const nextLevel = Math.max(0, regulationLevel - 15);
              setRegulationLevel(nextLevel);
            }
            if (data.error) {
              finishStreamingMessage();
              console.error('Stream error:', data.error);
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      finishStreamingMessage();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      finishStreamingMessage();
      setLoading(false);

      // Add error message to chat
      addMessage({
        id: `msg-${Date.now()}-error`,
        role: 'SYSTEM',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      });
    }
  }, [
    sessionId, messages, currentPhase, regulationLevel,
    addMessage, startStreamingMessage, appendToStreamingMessage,
    finishStreamingMessage, setLoading, addSignal, triggerIntervention,
    updatePhaseInternal, setPhase, setRegulationLevel,
  ]);

  const createSession = useCallback(async (
    subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS',
    mode: string = 'FORWARD',
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, engagementMode: mode }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { data } = await response.json();
      startSession(data.id, subject);
      setEngagementMode(mode as Parameters<typeof setEngagementMode>[0]);
      setLoading(false);
      return data.id;
    } catch {
      setLoading(false);
      return null;
    }
  }, [setLoading, startSession, setEngagementMode]);

  const updatePhase = useCallback(async (phase: string) => {
    if (!sessionId) return;
    await updatePhaseInternal(sessionId, phase);
  }, [sessionId, updatePhaseInternal]);

  const updateEngagementMode = useCallback(async (mode: string) => {
    if (!sessionId) return;
    setEngagementMode(mode as Parameters<typeof setEngagementMode>[0]);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagementMode: mode }),
      });
    } catch {
      // Silently fail -- local state is updated
    }
  }, [sessionId, setEngagementMode]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endSession: true }),
      });
    } catch {
      // Continue with local cleanup regardless
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
    endSessionStore();
  }, [sessionId, endSessionStore]);

  const detectTraceStep = useCallback((): TRACEStep => {
    const assistantMessages = messages.filter((m) => m.role === 'ASSISTANT');
    if (assistantMessages.length === 0) return null;
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    return detectTRACEStep(lastAssistant.content);
  }, [messages]);

  return {
    sendMessage,
    createSession,
    endSession,
    updatePhase,
    updateEngagementMode,
    detectTraceStep,
  };
}
