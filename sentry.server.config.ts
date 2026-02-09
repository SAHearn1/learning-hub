// Sentry server-side configuration
// Only active when NEXT_PUBLIC_SENTRY_DSN is set

async function initSentryServer() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,

      // Performance: sample 10% of transactions in production
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Capture 100% of errors
      sampleRate: 1.0,

      // Spotlight: enable in development for local debugging
      spotlight: process.env.NODE_ENV === 'development',

      beforeSend(event: Record<string, any>) {
        // Scrub PII from error reports (COPPA/FERPA compliance)
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
          delete event.user.username;
        }

        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        return event;
      },
    });
  } catch {
    // @sentry/nextjs not installed — monitoring disabled
  }
}

initSentryServer();
