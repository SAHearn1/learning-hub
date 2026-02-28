'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">Something went wrong</h1>
      <p className="mt-2 text-neutral-600">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-neutral-400">Error ID: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Try again
      </button>
    </main>
  );
}
