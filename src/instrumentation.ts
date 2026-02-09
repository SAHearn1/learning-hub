/**
 * Next.js instrumentation hook.
 *
 * Runs once when the Next.js server starts. Used to initialise
 * monitoring providers (Datadog APM, Sentry) before request handling.
 */
export async function register() {
  // Only run on server-side (instrumentation hooks should only run server-side,
  // but this is an extra safety check)
  if (typeof window !== 'undefined') {
    return;
  }

  // Datadog APM — must initialise before other imports
  if (process.env.DD_API_KEY) {
    const { initDatadog } = await import('@/lib/datadog');
    initDatadog();
  }
}
