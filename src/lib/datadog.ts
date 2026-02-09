/**
 * Datadog APM initializer.
 *
 * `dd-trace` must be imported before any other module to instrument
 * HTTP, database drivers, and framework calls. This module is
 * imported from `instrumentation.ts` (Next.js instrumentation hook).
 *
 * Activation requires DD_API_KEY to be set. Without it this is a no-op.
 */

let initialized = false;

export function initDatadog(): void {
  if (initialized) return;
  if (!process.env.DD_API_KEY) return;

  try {
    // dd-trace must be require()'d — it patches Node globals at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracer = require('dd-trace');
    tracer.init({
      service: process.env.DD_SERVICE || 'rootwork-tutor',
      env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      logInjection: true,
      runtimeMetrics: true,
      profiling: process.env.NODE_ENV === 'production',
      // Sample 10% of traces in production, 100% in dev
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    initialized = true;
    console.log('[datadog] APM tracer initialized');
  } catch {
    // dd-trace not installed or failed — monitoring disabled
    console.warn('[datadog] dd-trace not available, APM disabled');
  }
}
