'use client';

import { useEffect, useRef, useMemo } from 'react';
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
      {isStreaming && !streamingMessageId && <TypingIndicator />}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-1 text-xs font-semibold text-primary-700">RootGuide</div>
        <div className="flex items-center gap-1" aria-label="RootGuide is thinking">
          <span className="block h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '0ms' }} />
          <span className="block h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '150ms' }} />
          <span className="block h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Code block (```)
    const codeBlockMatch = remaining.match(/^```(?:\w*)\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      parts.push(
        <pre key={keyIdx++} className="my-2 overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs">
          <code>{codeBlockMatch[1].trimEnd()}</code>
        </pre>
      );
      remaining = remaining.slice(codeBlockMatch[0].length);
      continue;
    }

    // Inline code
    const inlineCodeMatch = remaining.match(/^`([^`]+)`/);
    if (inlineCodeMatch) {
      parts.push(
        <code key={keyIdx++} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-mono">
          {inlineCodeMatch[1]}
        </code>
      );
      remaining = remaining.slice(inlineCodeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={keyIdx++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<em key={keyIdx++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text up to the next special character
    const nextSpecial = remaining.slice(1).search(/[`*]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else {
      parts.push(remaining.slice(0, nextSpecial + 1));
      remaining = remaining.slice(nextSpecial + 1);
    }
  }

  return parts;
}

function FormattedContent({ content }: { content: string }) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  return <>{rendered}</>;
}

function MessageBubble({
  message,
  isCurrentlyStreaming,
}: {
  message: ChatMessage;
  isCurrentlyStreaming: boolean;
}) {
  if (message.role === 'SYSTEM') {
    const isPhaseTransition = message.content.includes('5Rs transition');
    return (
      <div className="flex justify-center">
        <div className={cn(
          'rounded-lg px-4 py-2 text-sm max-w-md text-center',
          isPhaseTransition
            ? 'bg-secondary-50 text-secondary-700 border border-secondary-200'
            : 'bg-neutral-100 text-neutral-600',
        )}>
          {isPhaseTransition && (
            <svg className="mx-auto mb-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          )}
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
          {isUser ? message.content : <FormattedContent content={message.content} />}
          {isCurrentlyStreaming && (
            <span className="inline-block ml-1" aria-label="Typing">
              <span className="inline-block h-3 w-0.5 animate-pulse bg-primary-500 rounded-full" />
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
