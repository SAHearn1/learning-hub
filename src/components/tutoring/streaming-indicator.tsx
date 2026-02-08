'use client';

import { Loader2 } from 'lucide-react';

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-neutral-600">RootGuide is thinking...</span>
    </div>
  );
}
