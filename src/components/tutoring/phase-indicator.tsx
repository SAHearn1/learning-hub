'use client';

import { type FiveRPhase } from '@prisma/client';
import { cn } from '@/lib/utils';

interface PhaseIndicatorProps {
  currentPhase: FiveRPhase;
  className?: string;
}

const PHASES: { key: FiveRPhase; label: string; description: string }[] = [
  { key: 'ROOT', label: 'Root', description: 'Foundation & Entry' },
  { key: 'REGULATE', label: 'Regulate', description: 'Emotional Check-in' },
  { key: 'REFLECT', label: 'Reflect', description: 'Learning & Doing' },
  { key: 'RESTORE', label: 'Restore', description: 'Review & Consolidation' },
  { key: 'RECONNECT', label: 'Reconnect', description: 'Application & Integration' },
];

export function PhaseIndicator({ currentPhase, className }: PhaseIndicatorProps) {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        {PHASES.map((phase, index) => {
          const isActive = phase.key === currentPhase;
          const isPast = index < currentIndex;

          return (
            <div key={phase.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                  isActive && 'border-primary bg-primary text-primary-foreground shadow-md',
                  isPast && 'border-primary/50 bg-primary/10 text-primary',
                  !isActive && !isPast && 'border-neutral-300 bg-neutral-100 text-neutral-400'
                )}
                title={`${phase.label}: ${phase.description}`}
              >
                {index + 1}
              </div>
              {index < PHASES.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors',
                    isPast ? 'bg-primary/50' : 'bg-neutral-300'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-neutral-900">
          {PHASES[currentIndex]?.label}
        </p>
        <p className="text-xs text-neutral-600">{PHASES[currentIndex]?.description}</p>
      </div>
    </div>
  );
}
