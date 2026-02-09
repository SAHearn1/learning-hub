'use client';

import { useState } from 'react';
import type { Message, FiveRPhase, EngagementMode, Subject } from '@prisma/client';
import { ChatInterface } from '@/components/tutoring/chat-interface';
import { SessionHeader } from '@/components/tutoring/session-header';
import { PhaseIndicator } from '@/components/tutoring/phase-indicator';
import { ModeSelector } from '@/components/tutoring/mode-selector';
import { useRouter } from 'next/navigation';

interface LearnClientProps {
  session: {
    id: string;
    subject: Subject;
    currentPhase: FiveRPhase;
    engagementMode: EngagementMode;
    startedAt: Date;
  };
  messages: Message[];
  regulationLevel: number;
  studentId: string;
}

export function LearnClient({ session, messages, regulationLevel, studentId }: LearnClientProps) {
  const router = useRouter();
  const [currentPhase, setCurrentPhase] = useState<FiveRPhase>(session.currentPhase);
  const [currentMode, setCurrentMode] = useState<EngagementMode>(session.engagementMode);
  const [isEndingSession, setIsEndingSession] = useState(false);

  const handleModeChange = async (mode: EngagementMode) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagementMode: mode }),
      });

      if (response.ok) {
        setCurrentMode(mode);
        
        // Add system message about mode change (optimistic update)
        // The actual message will be handled by the server
      }
    } catch (error) {
      console.error('Error changing mode:', error);
    }
  };

  const handlePhaseChange = async (phase: FiveRPhase) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPhase: phase }),
      });

      if (response.ok) {
        setCurrentPhase(phase);
      }
    } catch (error) {
      console.error('Error changing phase:', error);
    }
  };

  const handleEndSession = async () => {
    if (isEndingSession) return;
    
    setIsEndingSession(true);

    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      });

      if (response.ok) {
        // Redirect to progress or dashboard page
        router.push('/progress');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setIsEndingSession(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <a
        href="#learning-chat-log"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to conversation
      </a>
      {/* Session Header */}
      <SessionHeader
        subject={session.subject}
        currentPhase={currentPhase}
        currentMode={currentMode}
        startedAt={session.startedAt}
        onEndSession={handleEndSession}
      />

      {/* Phase Indicator & Mode Selector */}
      <section className="border-b bg-white px-4 py-3" aria-label="Session controls">
        <div className="mx-auto max-w-5xl space-y-3">
          <PhaseIndicator currentPhase={currentPhase} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-neutral-700">Engagement mode</span>
            <ModeSelector
              currentMode={currentMode}
              onModeChange={handleModeChange}
              disabled={isEndingSession}
            />
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <section className="flex-1 overflow-hidden" aria-label="Learning conversation">
        <div className="mx-auto h-full max-w-5xl">
          <ChatInterface
            id="learning-chat-log"
            sessionId={session.id}
            initialMessages={messages.map((msg) => ({
              ...msg,
              createdAt: new Date(msg.createdAt),
            }))}
            currentPhase={currentPhase}
            currentMode={currentMode}
            regulationLevel={regulationLevel}
            onPhaseChange={handlePhaseChange}
            onModeChange={handleModeChange}
          />
        </div>
      </section>
    </div>
  );
}
