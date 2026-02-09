/**
 * Next.js instrumentation hook.
 *
 * Runs once when the Next.js server starts. Used to initialise
 * monitoring providers (Datadog APM, Sentry) before request handling.
 */
export async function register() {
  // Datadog APM — must initialise before other imports
  if (process.env.DD_API_KEY) {
    const { initDatadog } = await import('@/lib/datadog');
    initDatadog();
  }
}
