'use client';

import { Button } from '@/components/ui/button';

interface EndSessionDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndSessionDialog({ onConfirm, onCancel }: EndSessionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="End session confirmation"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <h3 className="mt-3 text-lg font-semibold text-neutral-900">End this session?</h3>
          <p className="mt-2 text-sm text-neutral-600">
            Your progress has been saved. You can always start a new session when you&apos;re ready.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Keep Learning
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
          >
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
}
