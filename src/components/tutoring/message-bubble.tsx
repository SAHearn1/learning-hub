'use client';

import type { MessageRole } from '@prisma/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  timestamp: Date;
  className?: string;
}

export function MessageBubble({ role, content, timestamp, className }: MessageBubbleProps) {
  const isSystem = role === 'SYSTEM';
  const isAssistant = role === 'ASSISTANT';
  const isUser = role === 'USER';

  if (isSystem) {
    return (
      <div className={cn('flex justify-center py-4', className)}>
        <div className="max-w-md rounded-lg bg-neutral-100 px-4 py-2 text-center text-sm text-neutral-700">
          {content}
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
            isAssistant && 'bg-primary-50 text-neutral-900',
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
