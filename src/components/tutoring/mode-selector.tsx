'use client';

import { type EngagementMode } from '@prisma/client';
import { ChevronDown, ArrowRight, ArrowLeft, Bug, Sparkles, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  currentMode: EngagementMode;
  onModeChange: (mode: EngagementMode) => void;
  disabled?: boolean;
  className?: string;
}

const MODES: { key: EngagementMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'FORWARD',
    label: 'Forward',
    description: 'Standard problem-solving flow',
    icon: <ArrowRight className="h-4 w-4" />,
  },
  {
    key: 'REVERSE',
    label: 'Reverse',
    description: 'Start with solution, explain why',
    icon: <ArrowLeft className="h-4 w-4" />,
  },
  {
    key: 'ERROR_ANALYSIS',
    label: 'Error Analysis',
    description: 'Find and fix mistakes',
    icon: <Bug className="h-4 w-4" />,
  },
  {
    key: 'MULTIPLE_PATHWAYS',
    label: 'Multiple Pathways',
    description: 'Show different solution methods',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: 'PROBLEM_POSING',
    label: 'Problem Posing',
    description: 'Create your own problems',
    icon: <Lightbulb className="h-4 w-4" />,
  },
];

export function ModeSelector({ currentMode, onModeChange, disabled, className }: ModeSelectorProps) {
  const currentModeData = MODES.find((m) => m.key === currentMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('gap-2', className)}
          size="sm"
          aria-label={`Engagement mode: ${currentModeData?.label ?? "Unknown"}`}
        >
          {currentModeData?.icon}
          <span>{currentModeData?.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(90vw,16rem)]">
        {MODES.map((mode) => (
          <DropdownMenuItem
            key={mode.key}
            onClick={() => onModeChange(mode.key)}
            className="flex cursor-pointer flex-col items-start gap-1 py-3"
          >
            <div className="flex items-center gap-2">
              {mode.icon}
              <span className="font-semibold">{mode.label}</span>
              {mode.key === currentMode && (
                <span className="ml-auto text-xs text-primary">✓</span>
              )}
            </div>
            <span className="text-xs text-neutral-600">{mode.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
