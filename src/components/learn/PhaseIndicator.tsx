'use client';

import { BRAND } from '@/brand/brand';
import { cn } from '@/lib/utils';

type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';

interface PhaseIndicatorProps {
  currentPhase: FiveRPhase;
  onPhaseChange: (phase: FiveRPhase) => void;
}

const PHASE_ORDER: FiveRPhase[] = ['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT'];

const PHASE_STYLES: Record<FiveRPhase, { bg: string; text: string; ring: string; activeBg: string }> = {
  ROOT: {
    bg: 'bg-[var(--phase-root-bg)]',
    text: 'text-[var(--phase-root-color)]',
    ring: 'ring-[var(--phase-root-border)]',
    activeBg: 'bg-[var(--phase-root-color)]',
  },
  REGULATE: {
    bg: 'bg-[var(--phase-regulate-bg)]',
    text: 'text-[var(--phase-regulate-color)]',
    ring: 'ring-[var(--phase-regulate-border)]',
    activeBg: 'bg-[var(--phase-regulate-color)]',
  },
  REFLECT: {
    bg: 'bg-[var(--phase-reflect-bg)]',
    text: 'text-[var(--phase-reflect-color)]',
    ring: 'ring-[var(--phase-reflect-border)]',
    activeBg: 'bg-[var(--phase-reflect-color)]',
  },
  RESTORE: {
    bg: 'bg-[var(--phase-restore-bg)]',
    text: 'text-[var(--phase-restore-color)]',
    ring: 'ring-[var(--phase-restore-border)]',
    activeBg: 'bg-[var(--phase-restore-color)]',
  },
  RECONNECT: {
    bg: 'bg-[var(--phase-reconnect-bg)]',
    text: 'text-[var(--phase-reconnect-color)]',
    ring: 'ring-[var(--phase-reconnect-border)]',
    activeBg: 'bg-[var(--phase-reconnect-color)]',
  },
};

export function PhaseIndicator({ currentPhase, onPhaseChange }: PhaseIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      {PHASE_ORDER.map((phase, idx) => {
        const isActive = phase === currentPhase;
        const phaseInfo = BRAND.phases[phase];
        const styles = PHASE_STYLES[phase];

        return (
          <div key={phase} className="flex items-center">
            {idx > 0 && (
              <div className="mx-0.5 h-px w-2 bg-neutral-300" aria-hidden="true" />
            )}
            <button
              onClick={() => onPhaseChange(phase)}
              title={`${phaseInfo.name}: ${phaseInfo.description}`}
              aria-label={`Switch to ${phaseInfo.name} phase: ${phaseInfo.description}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                isActive
                  ? `${styles.activeBg} text-white shadow-sm`
                  : `${styles.bg} ${styles.text} hover:ring-1 ${styles.ring}`,
              )}
            >
              <span className="hidden sm:inline">{phaseInfo.name}</span>
              <span className="sm:hidden">{phaseInfo.name[0]}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
