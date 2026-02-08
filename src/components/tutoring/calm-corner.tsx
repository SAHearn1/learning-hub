'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CalmCornerProps {
  open: boolean;
  onClose: () => void;
  onReady: () => void;
}

export function CalmCorner({ open, onClose, onReady }: CalmCornerProps) {
  const [breathingPhase, setBreathingPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) return prev - 1;

        // Cycle through breathing phases
        setBreathingPhase((phase) => {
          if (phase === 'in') {
            setCountdown(4);
            return 'hold';
          } else if (phase === 'hold') {
            setCountdown(4);
            return 'out';
          } else {
            setCountdown(4);
            return 'in';
          }
        });

        return 4;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  const handleReady = () => {
    onReady();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Calm Corner</DialogTitle>
          <DialogDescription className="text-center">
            Let&apos;s take a moment to breathe together
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Breathing animation */}
          <div className="relative flex h-48 w-48 items-center justify-center">
            <div
              className={cn(
                'absolute rounded-full bg-gradient-to-br from-blue-400 to-purple-400 transition-all duration-1000 ease-in-out',
                breathingPhase === 'in' && 'h-32 w-32',
                breathingPhase === 'hold' && 'h-32 w-32',
                breathingPhase === 'out' && 'h-16 w-16'
              )}
            />
            <div className="z-10 text-center">
              <div className="text-4xl font-bold text-white">{countdown}</div>
              <div className="text-sm font-semibold uppercase tracking-wider text-white">
                {breathingPhase === 'in' ? 'Breathe In' : breathingPhase === 'hold' ? 'Hold' : 'Breathe Out'}
              </div>
            </div>
          </div>

          {/* Affirmations */}
          <div className="space-y-2 text-center">
            <p className="text-sm text-neutral-700">You&apos;re doing great.</p>
            <p className="text-sm text-neutral-700">Learning is a journey, not a race.</p>
            <p className="text-sm text-neutral-700">Your brain is growing stronger with every challenge.</p>
          </div>

          {/* Actions */}
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Take a Break
            </Button>
            <Button onClick={handleReady} className="flex-1">
              I&apos;m Ready to Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
