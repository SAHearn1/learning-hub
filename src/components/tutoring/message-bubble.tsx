'use client';

import type { MessageRole } from '@prisma/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  timestamp: Date;
  className?: string;
  messageId?: string;
  onInterventionReady?: () => void;
}

export function MessageBubble({ role, content, timestamp, className, messageId, onInterventionReady }: MessageBubbleProps) {
  const [isReady, setIsReady] = useState(false);
  const isSystem = role === 'SYSTEM';
  const isAssistant = role === 'ASSISTANT';
  const isUser = role === 'USER';

  // Detect if this is a regulation intervention message
  const isIntervention = isAssistant && (
    content.includes('Garden Breathing') ||
    content.includes('5-4-3-2-1 Grounding') ||
    content.includes('Garden Sensory Reset')
  );

  const handleReadyToContinue = () => {
    setIsReady(true);
    // Notify parent component if callback provided
    if (onInterventionReady) {
      onInterventionReady();
    }
  };

  if (isSystem) {
    return (
      <div className={cn('flex justify-center py-4', className)}>
        <div className="max-w-md rounded-lg bg-neutral-100 px-4 py-2 text-center text-sm text-neutral-700">
          {content}
        </div>
      </div>
    );
  }

  // Special rendering for regulation interventions
  if (isIntervention) {
    return (
      <div className={cn('flex justify-center py-4', className)}>
        <div className="max-w-2xl w-full">
          <div className="border-l-4 border-green-500 bg-green-50 rounded-lg px-6 py-4">
            {/* Plant emoji indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🌱</span>
              <span className="text-sm font-medium text-green-800">Regulation Exercise</span>
            </div>

            {/* Markdown content */}
            <div className="prose prose-sm text-green-800 max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-bold text-green-900 mt-4 mb-3" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-3 text-green-800" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside space-y-2 mb-4" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-green-800" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-4 border-green-200" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-green-900" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Ready to continue button */}
            {!isReady && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleReadyToContinue}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-sm"
                >
                  I&apos;m ready to continue learning
                </button>
              </div>
            )}

            {isReady && (
              <div className="mt-4 text-center text-green-700 text-sm font-medium">
                ✓ Ready to continue
              </div>
            )}
          </div>

          <span className="block mt-2 px-1 text-xs text-neutral-500">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isAssistant && 'bg-primary text-primary-foreground',
          isUser && 'bg-neutral-300 text-neutral-700'
        )}
      >
        {isAssistant ? 'AI' : 'You'}
      </div>

      {/* Message content */}
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isAssistant && 'bg-blue-50 text-neutral-900',
            isUser && 'bg-neutral-200 text-neutral-900'
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        </div>
        <span className="px-1 text-xs text-neutral-500">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
