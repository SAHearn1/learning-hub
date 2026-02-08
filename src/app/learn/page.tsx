'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { useRegulationStore } from '@/stores/regulation-store';
import { useChat, type SessionSummary as SessionSummaryData } from '@/hooks/useChat';
import { SessionSetup } from '@/components/learn/SessionSetup';
import { SessionHeader } from '@/components/learn/SessionHeader';
import { ChatMessageList } from '@/components/learn/ChatMessageList';
import { ChatInput } from '@/components/learn/ChatInput';
import { CalmCorner } from '@/components/learn/CalmCorner';
import { EndSessionDialog } from '@/components/learn/EndSessionDialog';
import { SessionSummary } from '@/components/learn/SessionSummary';

type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';
type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';

export default function LearnPage() {
  const router = useRouter();
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
    getSessionSummary,
  } = useChat();

  const traceStep = detectTraceStep();

  const handleStartSession = useCallback(
    async (selectedSubject: Subject, selectedMode: EngagementMode) => {
      setStartError(null);
      setCompletedSummary(null);
      const createdSessionId = await createSession(selectedSubject, selectedMode);
      if (!createdSessionId) {
        setStartError('We could not start your session. Please try again in a moment.');
      }
    },
    [createSession],
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

  const handleEndSessionRequest = useCallback(() => {
    setShowEndDialog(true);
  }, []);

  const handleEndSessionConfirm = useCallback(() => {
    const summary = getSessionSummary();
    setShowEndDialog(false);
    endSession();
    regulationReset();
    setCompletedSummary(summary);
  }, [endSession, regulationReset, getSessionSummary]);

  const handleEndSessionCancel = useCallback(() => {
    setShowEndDialog(false);
  }, []);

  const handleCalmCornerDismiss = useCallback(() => {
    dismissIntervention();
  }, [dismissIntervention]);

  const handleCalmCornerContinue = useCallback(() => {
    dismissIntervention();
    if (currentPhase === 'REGULATE') {
      updatePhase('REFLECT');
    }
  }, [dismissIntervention, currentPhase, updatePhase]);

  // Session just ended: show summary
  if (completedSummary) {
    return (
      <main className="min-h-screen">
        <SessionSummary
          summary={completedSummary}
          onNewSession={() => setCompletedSummary(null)}
          onViewProgress={() => router.push('/progress')}
        />
      </main>
    );
  }

  // No active session: show setup
  if (!sessionId || !subject) {
    return (
      <main className="min-h-screen px-6 py-12">
        <SessionSetup
          onStart={handleStartSession}
          isLoading={isLoading}
          startError={startError}
          onClearError={() => setStartError(null)}
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
        onEndSession={handleEndSessionRequest}
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
            : currentPhase === 'REGULATE'
              ? 'Take your time. Share what you need...'
              : currentPhase === 'RESTORE'
                ? 'Let\'s work through this together...'
                : 'Type your response...'
        }
      />

      {/* End session confirmation */}
      {showEndDialog && (
        <EndSessionDialog
          onConfirm={handleEndSessionConfirm}
          onCancel={handleEndSessionCancel}
        />
      )}

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
