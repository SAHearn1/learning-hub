'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  timestamp: Date;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
}

export function ChatMessageList({ messages, isStreaming, streamingMessageId }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-3" aria-hidden="true">
            {/* Leaf/sprout icon using CSS */}
            <svg className="mx-auto h-12 w-12 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0l-2-2m2 2l2-2" />
            </svg>
          </div>
          <p className="text-lg font-medium text-neutral-700">Ready to grow your thinking?</p>
          <p className="mt-1 text-sm text-neutral-500">
            RootGuide is here to help. Type a message to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isCurrentlyStreaming={isStreaming && message.id === streamingMessageId}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isCurrentlyStreaming,
}: {
  message: ChatMessage;
  isCurrentlyStreaming: boolean;
}) {
  if (message.role === 'SYSTEM') {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-600 max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }

  const isUser = message.role === 'USER';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-md shadow-sm',
        )}
      >
        {!isUser && (
          <div className="mb-1 text-xs font-semibold text-primary-700">
            RootGuide
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isCurrentlyStreaming && (
            <span className="inline-block ml-1 animate-pulse" aria-label="Typing">
              <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full" />
            </span>
          )}
        </div>
        <div
          className={cn(
            'mt-1 text-[10px]',
            isUser ? 'text-primary-200' : 'text-neutral-400',
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
