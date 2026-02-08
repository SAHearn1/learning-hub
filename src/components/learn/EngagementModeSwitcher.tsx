'use client';

import { useState, useRef, useEffect } from 'react';
import { BRAND } from '@/brand/brand';
import { cn } from '@/lib/utils';

type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';

interface EngagementModeSwitcherProps {
  currentMode: EngagementMode;
  onModeChange: (mode: EngagementMode) => void;
}

const MODE_ORDER: EngagementMode[] = [
  'FORWARD',
  'REVERSE',
  'ERROR_ANALYSIS',
  'MULTIPLE_PATHWAYS',
  'PROBLEM_POSING',
];

const MODE_ICONS: Record<EngagementMode, React.ReactNode> = {
  FORWARD: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  ),
  REVERSE: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
    </svg>
  ),
  ERROR_ANALYSIS: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  MULTIPLE_PATHWAYS: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  PROBLEM_POSING: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
};

export function EngagementModeSwitcher({
  currentMode,
  onModeChange,
}: EngagementModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const currentInfo = BRAND.engagementModes[currentMode];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Engagement mode: ${currentInfo.name}`}
      >
        {MODE_ICONS[currentMode]}
        <span>{currentInfo.name}</span>
        <svg className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg"
          role="listbox"
          aria-label="Select engagement mode"
        >
          {MODE_ORDER.map((mode) => {
            const info = BRAND.engagementModes[mode];
            const isActive = mode === currentMode;

            return (
              <button
                key={mode}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onModeChange(mode);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-700 hover:bg-neutral-50',
                )}
              >
                {MODE_ICONS[mode]}
                <span className="font-medium">{info.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
