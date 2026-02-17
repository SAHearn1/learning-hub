'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type Phase = 'root' | 'regulate' | 'reflect' | 'restore' | 'reconnect';

const PHASE_CONFIG: Record<Phase, { src: string; label: string }> = {
  root: { src: '/brand/5r-root.png', label: 'Root' },
  regulate: { src: '/brand/5r-regulate.png', label: 'Regulate' },
  reflect: { src: '/brand/5r-reflect.png', label: 'Reflect' },
  restore: { src: '/brand/5r-restore.png', label: 'Restore' },
  reconnect: { src: '/brand/5r-reconnect.png', label: 'Reconnect' },
};

const ICON_SIZES = { sm: 24, md: 32, lg: 48 } as const;

interface FiveRIconProps {
  phase: Phase;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function FiveRIcon({ phase, size = 'md', showLabel = false, className }: FiveRIconProps) {
  const config = PHASE_CONFIG[phase];
  const px = ICON_SIZES[size];

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Image
        src={config.src}
        alt={config.label}
        width={px}
        height={px}
        className="flex-shrink-0 rounded-full"
      />
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
          {config.label}
        </span>
      )}
    </div>
  );
}
