'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CalmCornerProps {
  onDismiss: () => void;
  onContinue: () => void;
}

type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale';

export function CalmCorner({ onDismiss, onContinue }: CalmCornerProps) {
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase>('idle');
  const [breathCount, setBreathCount] = useState(0);

  function startBreathing() {
    setBreathingActive(true);
    setBreathCount(0);
    runBreathCycle(0);
  }

  function runBreathCycle(count: number) {
    if (count >= 3) {
      setBreathingActive(false);
      setBreathingPhase('idle');
      setBreathCount(3);
      return;
    }

    // Inhale 4s
    setBreathingPhase('inhale');
    setTimeout(() => {
      // Hold 4s
      setBreathingPhase('hold');
      setTimeout(() => {
        // Exhale 4s
        setBreathingPhase('exhale');
        setTimeout(() => {
          setBreathCount(count + 1);
          runBreathCycle(count + 1);
        }, 4000);
      }, 4000);
    }, 4000);
  }

  const breathingLabel =
    breathingPhase === 'inhale'
      ? 'Breathe in...'
      : breathingPhase === 'hold'
        ? 'Hold...'
        : breathingPhase === 'exhale'
          ? 'Breathe out...'
          : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Calm Corner"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl bg-[var(--phase-regulate-bg)] p-8 shadow-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--phase-regulate-color)]">
            Calm Corner
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            It looks like things might be getting tough right now. That&apos;s completely okay.
            Let&apos;s take a moment together.
          </p>
        </div>

        {/* Breathing Exercise */}
        <div className="mt-6 flex flex-col items-center">
          {breathingActive ? (
            <div className="flex flex-col items-center space-y-4">
              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full border-4 border-[var(--phase-regulate-border)] transition-all duration-[4000ms] ease-in-out ${
                  breathingPhase === 'inhale'
                    ? 'scale-110 bg-[var(--phase-regulate-color)]/10'
                    : breathingPhase === 'hold'
                      ? 'scale-110 bg-[var(--phase-regulate-color)]/20'
                      : breathingPhase === 'exhale'
                        ? 'scale-90 bg-[var(--phase-regulate-color)]/5'
                        : 'scale-100'
                }`}
                aria-live="polite"
              >
                <span className="text-lg font-semibold text-[var(--phase-regulate-color)]">
                  {breathingLabel}
                </span>
              </div>
              <p className="text-sm text-neutral-500">
                Breath {Math.min(breathCount + 1, 3)} of 3
              </p>
            </div>
          ) : breathCount >= 3 ? (
            <div className="space-y-3 text-center">
              <p className="text-lg font-medium text-[var(--phase-regulate-color)]">
                Great job taking those breaths.
              </p>
              <p className="text-sm text-neutral-600">
                Your brain is building new connections right now.
                When you&apos;re ready, you can keep going.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={startBreathing}
                  className="rounded-xl border-2 border-[var(--phase-regulate-border)] bg-white p-4 text-left transition-colors hover:bg-[var(--phase-regulate-bg)]"
                >
                  <div className="font-semibold text-[var(--phase-regulate-color)]">
                    Breathing Exercise
                  </div>
                  <p className="mt-1 text-xs text-neutral-600">
                    Three deep breaths together (inhale 4s, hold 4s, exhale 4s)
                  </p>
                </button>

                <div className="rounded-xl border-2 border-neutral-200 bg-white p-4">
                  <div className="font-semibold text-neutral-700">Grounding Check</div>
                  <p className="mt-1 text-xs text-neutral-600">
                    Name 5 things you can see, 4 you can touch, 3 you can hear,
                    2 you can smell, and 1 you can taste.
                  </p>
                </div>

                <div className="rounded-xl border-2 border-neutral-200 bg-white p-4">
                  <div className="font-semibold text-neutral-700">Positive Reframe</div>
                  <p className="mt-1 text-xs text-neutral-600">
                    Struggling means your brain is growing. Every challenge
                    you face is making you stronger and smarter.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDismiss}
          >
            Close
          </Button>
          <Button
            className="flex-1"
            onClick={onContinue}
          >
            I&apos;m Ready to Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
