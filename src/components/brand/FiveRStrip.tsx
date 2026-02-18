'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

const PHASES: ReadonlyArray<{
  key: string;
  label: string;
  src: string;
  description: string;
}> = [
  { key: 'root', label: 'Root', src: '/brand/5r-root.png', description: 'Ground & Connect' },
  { key: 'regulate', label: 'Regulate', src: '/brand/5r-regulate.png', description: 'Check In & Breathe' },
  { key: 'reflect', label: 'Reflect', src: '/brand/5r-reflect.png', description: 'Think & Reason' },
  { key: 'restore', label: 'Restore', src: '/brand/5r-restore.png', description: 'Learn & Grow' },
  { key: 'reconnect', label: 'Reconnect', src: '/brand/5r-reconnect.png', description: 'Apply & Share' },
];

interface FiveRStripProps {
  activePhase?: string;
  compact?: boolean;
  className?: string;
  onPhaseClick?: (phase: string) => void;
}

export function FiveRStrip({ activePhase, compact = false, className, onPhaseClick }: FiveRStripProps) {
  return (
    <nav
      aria-label="5R Learning Phases"
      className={cn('flex items-center gap-1 rounded-lg p-1', className)}
    >
      {PHASES.map((phase) => {
        const isActive = activePhase?.toUpperCase() === phase.key.toUpperCase();
        return (
          <button
            key={phase.key}
            type="button"
            onClick={() => onPhaseClick?.(phase.key)}
            disabled={!onPhaseClick}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-primary-900 ring-2 ring-secondary-400 shadow-md text-white'
                : 'bg-primary-700/60 text-white/80 hover:bg-primary-700/80 hover:text-white',
              !onPhaseClick && 'cursor-default',
              compact && 'px-2 py-1 text-xs',
            )}
            title={phase.description}
          >
            <Image
              src={phase.src}
              alt={phase.label}
              width={compact ? 18 : 22}
              height={compact ? 18 : 22}
              className="rounded-full"
            />
            {!compact && <span>{phase.label}</span>}
            {compact && <span className="sr-only">{phase.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
