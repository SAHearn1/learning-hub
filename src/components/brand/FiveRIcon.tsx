'use client';

import { cn } from '@/lib/utils';
import { Sprout, Wind, MessageCircle, Leaf, Handshake, type LucideIcon } from 'lucide-react';

type Phase = 'root' | 'regulate' | 'reflect' | 'restore' | 'reconnect';

const PHASE_CONFIG: Record<Phase, { Icon: LucideIcon; color: string; label: string }> = {
  root: { Icon: Sprout, color: 'bg-emerald-800 text-white', label: 'Root' },
  regulate: { Icon: Wind, color: 'bg-emerald-700 text-white', label: 'Regulate' },
  reflect: { Icon: MessageCircle, color: 'bg-emerald-600 text-white', label: 'Reflect' },
  restore: { Icon: Leaf, color: 'bg-amber-700 text-white', label: 'Restore' },
  reconnect: { Icon: Handshake, color: 'bg-amber-600 text-white', label: 'Reconnect' },
};

const ICON_SIZES = { sm: 14, md: 18, lg: 24 } as const;

interface FiveRIconProps {
  phase: Phase;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function FiveRIcon({ phase, size = 'md', showLabel = false, className }: FiveRIconProps) {
  const config = PHASE_CONFIG[phase];
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          config.color,
          sizeClasses[size],
        )}
        role="img"
        aria-label={config.label}
      >
        <config.Icon size={ICON_SIZES[size]} aria-hidden />
      </span>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
          {config.label}
        </span>
      )}
    </div>
  );
}
