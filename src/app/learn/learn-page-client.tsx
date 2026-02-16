'use client';

import { useCallback, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useRegulationStore } from '@/stores/regulation-store';
import { useChat } from '@/hooks/useChat';
import { SessionSetup } from '@/components/learn/SessionSetup';
import { SessionHeader } from '@/components/learn/SessionHeader';
import { ChatMessageList } from '@/components/learn/ChatMessageList';
import { ChatInput } from '@/components/learn/ChatInput';
import { CalmCorner } from '@/components/learn/CalmCorner';
import type { SessionSummary as SessionSummaryData } from '@/hooks/useChat';
import type { PreselectedTopic } from './page';

type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';
type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';

interface LearnPageClientProps {
  preselectedTopic: PreselectedTopic | null;
}

export function LearnPageClient({ preselectedTopic }: LearnPageClientProps) {
  const sessionId = useSessionStore((s) => s.sessionId);
  const subject = useSessionStore((s) => s.subject);
  const currentPhase = useSessionStore((s) => s.currentPhase);
  const engagementMode = useSessionStore((s) => s.engagementMode);
  const messages = useSessionStore((s) => s.messages);
  const isLoading = useSessionStore((s) => s.isLoading);
  const isStreaming = useSessionStore((s) => s.isStreaming);
  const streamingMessageId = useSessionStore((s) => s.streamingMessageId);

  const regulationLevel = useRegulationStore((s) => s.level);
  const interventionActive = useRegulationStore((s) => s.interventionActive);
  const dismissIntervention = useRegulationStore((s) => s.dismissIntervention);
  const regulationReset = useRegulationStore((s) => s.reset);

  const [showEndDialog, setShowEndDialog] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<SessionSummaryData | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const {
    sendMessage,
    createSession,
    endSession,
    updatePhase,
    updateEngagementMode,
    detectTraceStep,
  } = useChat();

  const traceStep = detectTraceStep();

  const handleStartSession = useCallback(
    async (selectedSubject: Subject, selectedMode: EngagementMode) => {
      setStartError(null);
      setCompletedSummary(null);
      try {
        await createSession(
          selectedSubject,
          selectedMode,
          preselectedTopic?.id,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setStartError(message);
      }
    },
    [createSession, preselectedTopic],
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage],
  );

  const handlePhaseChange = useCallback(
    (phase: FiveRPhase) => {
      updatePhase(phase);
    },
    [updatePhase],
  );

  const handleModeChange = useCallback(
    (mode: EngagementMode) => {
      updateEngagementMode(mode);
    },
    [updateEngagementMode],
  );

  const handleEndSession = useCallback(() => {
    endSession();
    regulationReset();
  }, [endSession, regulationReset]);

  const handleCalmCornerDismiss = useCallback(() => {
    dismissIntervention();
  }, [dismissIntervention]);

  const handleCalmCornerContinue = useCallback(() => {
    dismissIntervention();
    // If we transitioned to REGULATE, go back to REFLECT
    if (currentPhase === 'REGULATE') {
      updatePhase('REFLECT');
    }
  }, [dismissIntervention, currentPhase, updatePhase]);

  // No active session: show setup
  if (!sessionId || !subject) {
    return (
      <main className="min-h-screen px-6 py-12">
        <SessionSetup
          onStart={handleStartSession}
          isLoading={isLoading}
          startError={startError}
          onClearError={() => setStartError(null)}
          preselectedTopic={preselectedTopic}
        />
      </main>
    );
  }

  // Active session: show chat interface
  return (
    <main className="flex h-screen flex-col">
      <SessionHeader
        subject={subject}
        currentPhase={currentPhase}
        engagementMode={engagementMode}
        traceStep={traceStep}
        regulationLevel={regulationLevel}
        onPhaseChange={handlePhaseChange}
        onModeChange={handleModeChange}
        onEndSession={handleEndSession}
      />

      <ChatMessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
      />

      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading || isStreaming}
        placeholder={
          currentPhase === 'ROOT'
            ? 'How are you feeling today? Ready to grow some thinking?'
            : 'Type your response...'
        }
      />

      {/* Calm Corner overlay */}
      {interventionActive && (
        <CalmCorner
          onDismiss={handleCalmCornerDismiss}
          onContinue={handleCalmCornerContinue}
        />
      )}
    </main>
  );
}
