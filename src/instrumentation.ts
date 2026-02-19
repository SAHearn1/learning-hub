/**
 * Next.js instrumentation hook.
 *
 * Runs once when the Next.js server starts. Used to initialise
 * monitoring providers (Datadog APM, Sentry) before request handling.
 */
import { assertServerEnv } from '@/lib/env-preflight';

export async function register() {
  // Only run on server-side (instrumentation hooks should only run server-side,
  // but this is an extra safety check)
  if (typeof window !== 'undefined') {
    return;
  }

  // Fail fast when critical server configuration is missing.
  assertServerEnv();

  // Datadog APM only works in the Node.js runtime.
  if (process.env.DD_API_KEY && process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDatadog } = await import('@/lib/datadog');
    initDatadog();
  }
}

