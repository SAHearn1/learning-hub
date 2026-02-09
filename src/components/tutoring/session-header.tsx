'use client';

import type { Subject, FiveRPhase, EngagementMode } from '@prisma/client';
import { BookOpen, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SessionHeaderProps {
  subject: Subject;
  currentPhase: FiveRPhase;
  currentMode: EngagementMode;
  startedAt: Date;
  onEndSession?: () => void;
  className?: string;
}

const SUBJECT_LABELS: Record<Subject, string> = {
  MATH: 'Mathematics',
  SCIENCE: 'Science',
  LANGUAGE_ARTS: 'Language Arts',
};

export function SessionHeader({
  subject,
  currentPhase,
  currentMode,
  startedAt,
  onEndSession,
  className,
}: SessionHeaderProps) {
  const sessionDuration = formatDistanceToNow(startedAt, { addSuffix: false });

  return (
    <header className={cn('flex flex-col gap-3 border-b bg-white p-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-neutral-900">{SUBJECT_LABELS[subject]}</span>
        </div>
        <div className="items-center gap-2 text-sm text-neutral-600 hidden sm:flex" aria-label={`Session duration ${sessionDuration}`}>
          <Clock className="h-4 w-4" />
          <span>{sessionDuration}</span>
        </div>
      </div>
      {onEndSession && (
        <Button variant="outline" size="sm" onClick={onEndSession} className="w-full gap-2 sm:w-auto" aria-label="End current learning session">
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">End Session</span>
        </Button>
      )}
    </header>
  );
}
