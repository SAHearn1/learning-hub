'use client';

import { BRAND } from '@/brand/brand';
import { PhaseIndicator } from './PhaseIndicator';
import { EngagementModeSwitcher } from './EngagementModeSwitcher';
import { TRACEIndicator } from './TRACEIndicator';
import { Button } from '@/components/ui/button';
import type { TRACEStep } from '@/lib/regulation/detect-dysregulation';

type FiveRPhase = 'ROOT' | 'REGULATE' | 'REFLECT' | 'RESTORE' | 'RECONNECT';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';
type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';

interface SessionHeaderProps {
  subject: Subject;
  currentPhase: FiveRPhase;
  engagementMode: EngagementMode;
  traceStep: TRACEStep;
  regulationLevel: number;
  onPhaseChange: (phase: FiveRPhase) => void;
  onModeChange: (mode: EngagementMode) => void;
  onEndSession: () => void;
}

export function SessionHeader({
  subject,
  currentPhase,
  engagementMode,
  traceStep,
  regulationLevel,
  onPhaseChange,
  onModeChange,
  onEndSession,
}: SessionHeaderProps) {
  const subjectInfo = BRAND.subjects[subject];
  const phaseInfo = BRAND.phases[currentPhase];

  return (
    <div className="border-b border-neutral-200 bg-white">
      {/* Top bar: subject + regulation + end session */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: subjectInfo.color }}
            aria-label={subjectInfo.name}
          >
            {subjectInfo.shortName[0]}
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-800">
              {subjectInfo.name}
            </div>
            <div className="text-[11px] text-neutral-500">
              {phaseInfo.name} &middot; {phaseInfo.description}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Regulation level indicator */}
          <div className="flex items-center gap-1.5" title={`Regulation level: ${regulationLevel}%`}>
            <div className="h-2 w-16 overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  regulationLevel > 60
                    ? 'bg-green-500'
                    : regulationLevel > 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${regulationLevel}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400">{regulationLevel}%</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onEndSession}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Bottom bar: phase indicator + TRACE + engagement mode */}
      <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-1.5">
        <PhaseIndicator currentPhase={currentPhase} onPhaseChange={onPhaseChange} />

        <div className="flex items-center gap-3">
          <TRACEIndicator activeStep={traceStep} />
          <div className="h-4 w-px bg-neutral-200" aria-hidden="true" />
          <EngagementModeSwitcher currentMode={engagementMode} onModeChange={onModeChange} />
        </div>
      </div>
    </div>
  );
}
