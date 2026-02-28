'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring in production
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-5xl font-bold text-neutral-200">500</p>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-neutral-600">
        An unexpected error occurred. Our team has been notified. Please try again or return to the
        dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-neutral-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
