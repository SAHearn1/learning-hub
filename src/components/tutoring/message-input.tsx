'use client';

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = 'Type your message...',
  className,
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const helpTextId = useId();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2 sm:flex-row', className)} aria-label="Send message">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[60px] flex-1 resize-none"
        rows={2}
        aria-label="Message text"
        aria-describedby={helpTextId}
      />
      <p id={helpTextId} className="text-xs text-neutral-500">
        Press Enter to send. Press Shift+Enter for a new line.
      </p>
      <Button
        type="submit"
        disabled={disabled || !input.trim()}
        size="icon"
        className="h-[48px] w-full sm:h-[60px] sm:w-[60px]"
        aria-label="Send message"
      >
        <Send className="h-5 w-5" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
