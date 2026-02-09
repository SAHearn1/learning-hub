// Sentry client-side configuration
// Only active when NEXT_PUBLIC_SENTRY_DSN is set

async function initSentryClient() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,

      // Performance: sample 10% of transactions in production
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Session Replay: capture 1% of sessions, 100% of errored sessions
      replaysSessionSampleRate: 0.01,
      replaysOnErrorSampleRate: 1.0,

      // Filter noisy browser errors
      ignoreErrors: [
        'ResizeObserver loop',
        'Network request failed',
        'Load failed',
        'ChunkLoadError',
      ],

      beforeSend(event: Record<string, any>) {
        // Scrub PII from error reports
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });
  } catch {
    // @sentry/nextjs not installed — monitoring disabled
  }
}

initSentryClient();
