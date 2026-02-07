// Sentry server-side configuration
// Only active when NEXT_PUBLIC_SENTRY_DSN is set
// To enable: npm install @sentry/nextjs

async function initSentryServer() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  } catch {
    // @sentry/nextjs not installed — monitoring disabled
  }
}

initSentryServer();
