'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message as PrismaMessage, FiveRPhase, EngagementMode, Session } from '@prisma/client';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { StreamingIndicator } from './streaming-indicator';
import { CalmCorner } from './calm-corner';
import { detectDysregulation, updateRegulationLevel } from '@/lib/regulation/detector';
import { cn } from '@/lib/utils';

interface ChatMessage extends PrismaMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
  initialMessages: ChatMessage[];
  currentPhase: FiveRPhase;
  currentMode: EngagementMode;
  regulationLevel: number;
  onPhaseChange?: (phase: FiveRPhase) => void;
  onModeChange?: (mode: EngagementMode) => void;
  className?: string;
}

export function ChatInterface({
  sessionId,
  initialMessages,
  currentPhase,
  currentMode,
  regulationLevel: initialRegulationLevel,
  onPhaseChange,
  onModeChange,
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCalmCorner, setShowCalmCorner] = useState(false);
  const [regulationLevel, setRegulationLevel] = useState(initialRegulationLevel);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    setError(null);

    // Check for dysregulation
    const messageHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));

    const regulationCheck = detectDysregulation(content, messageHistory);
    const newRegulationLevel = updateRegulationLevel(regulationLevel, regulationCheck);
    setRegulationLevel(newRegulationLevel);

    // Trigger Calm Corner if needed
    if (regulationCheck.recommendation === 'calm-corner') {
      setShowCalmCorner(true);
      
      // Still send the message but with awareness
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'SYSTEM',
        content: "I notice you might need a moment. Let&apos;s take a deep breath together.",
        createdAt: new Date(),
        sessionId,
        metadata: null,
      };
      setMessages((prev) => [...prev, systemMessage]);
      return;
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date(),
      sessionId,
      metadata: null,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Start streaming response
    setIsStreaming(true);
    setStreamingContent('');

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.text) {
                fullText += data.text;
                setStreamingContent(fullText);
              }

              if (data.done) {
                // Add complete assistant message
                const assistantMessage: ChatMessage = {
                  id: `assistant-${Date.now()}`,
                  role: 'ASSISTANT',
                  content: fullText,
                  createdAt: new Date(),
                  sessionId,
                  metadata: null,
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingContent('');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          console.error('Error sending message:', err);
          setError(err.message || 'Failed to send message. Please try again.');
        }
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCalmCornerReady = () => {
    setShowCalmCorner(false);
    
    // Add system message confirming readiness
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: 'SYSTEM',
      content: "Great! I&apos;m glad you&apos;re feeling better. Let&apos;s continue learning together.",
      createdAt: new Date(),
      sessionId,
      metadata: null,
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  return (
    <div className={cn('flex h-full flex-col', className)} role="main" aria-label="Chat interface">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-6" role="log" aria-label="Chat messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-md space-y-2">
              <p className="text-lg font-semibold text-neutral-900">
                Start your learning session
              </p>
              <p className="text-sm text-neutral-600">
                Ask a question, share what you&apos;re working on, or tell me what you&apos;d like to learn about!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.createdAt}
              />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                role="ASSISTANT"
                content={streamingContent}
                timestamp={new Date()}
              />
            )}
            {isStreaming && !streamingContent && <StreamingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="border-t bg-error-50 px-4 py-3 text-sm text-error-700" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-white p-4" role="form" aria-label="Message input">
        <MessageInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          placeholder="Type your message... (Shift+Enter for new line)"
        />
      </div>

      {/* Calm Corner modal */}
      <CalmCorner
        open={showCalmCorner}
        onClose={() => setShowCalmCorner(false)}
        onReady={handleCalmCornerReady}
      />
    </div>
  );
}
