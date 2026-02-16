'use client';

import { cn } from '@/lib/utils';
import { Sprout, Wind, MessageCircle, Leaf, Handshake, type LucideIcon } from 'lucide-react';

const PHASES: ReadonlyArray<{
  key: string;
  label: string;
  color: string;
  Icon: LucideIcon;
  description: string;
}> = [
  { key: 'root', label: 'Root', color: 'bg-emerald-800', Icon: Sprout, description: 'Ground & Connect' },
  { key: 'regulate', label: 'Regulate', color: 'bg-emerald-700', Icon: Wind, description: 'Check In & Breathe' },
  { key: 'reflect', label: 'Reflect', color: 'bg-emerald-600', Icon: MessageCircle, description: 'Think & Reason' },
  { key: 'restore', label: 'Restore', color: 'bg-amber-700', Icon: Leaf, description: 'Learn & Grow' },
  { key: 'reconnect', label: 'Reconnect', color: 'bg-amber-600', Icon: Handshake, description: 'Apply & Share' },
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
              'text-white/80 hover:text-white',
              isActive
                ? `${phase.color} ring-2 ring-amber-400 shadow-md text-white`
                : `${phase.color}/60 hover:${phase.color}/80`,
              !onPhaseClick && 'cursor-default',
              compact && 'px-2 py-1 text-xs',
            )}
            title={phase.description}
          >
            <phase.Icon size={compact ? 14 : 16} aria-hidden />
            {!compact && <span>{phase.label}</span>}
            {compact && <span className="sr-only">{phase.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
