'use client';

import { cn } from '@/lib/utils';
import type { TRACEStep } from '@/lib/regulation/detect-dysregulation';

interface TRACEIndicatorProps {
  activeStep: TRACEStep;
}

const TRACE_STEPS: { key: TRACEStep; label: string; prompt: string }[] = [
  { key: 'THINK', label: 'T', prompt: 'What do you notice?' },
  { key: 'REASON', label: 'R', prompt: "What's your plan?" },
  { key: 'ARTICULATE', label: 'A', prompt: 'Talk through your thinking' },
  { key: 'CHECK', label: 'C', prompt: 'How do you know?' },
  { key: 'EXTEND', label: 'E', prompt: 'What else could you do?' },
];

export function TRACEIndicator({ activeStep }: TRACEIndicatorProps) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="TRACE protocol progress">
      {TRACE_STEPS.map(({ key, label, prompt }) => {
        const isActive = key === activeStep;

        return (
          <div
            key={key}
            title={`${key}: ${prompt}`}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold transition-all',
              isActive
                ? 'bg-secondary-500 text-white shadow-sm scale-110'
                : 'bg-neutral-100 text-neutral-400',
            )}
            aria-label={`${key}: ${prompt}${isActive ? ' (active)' : ''}`}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
