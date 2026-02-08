import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  [key: string]: unknown;
}

/**
 * Report an error to the monitoring service.
 * When Sentry is configured (NEXT_PUBLIC_SENTRY_DSN set), errors are sent there.
 * Always logs via structured logger as a fallback.
 */
export function captureError(error: unknown, context?: ErrorContext) {
  logger.error('Captured error', error, context);

  // Sentry integration — dynamic import to avoid bundling if not configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        if (context) Sentry.setContext('app', context);
        Sentry.captureException(error);
      })
      .catch(() => {
        // Sentry not installed — that's fine, we already logged
      });
  }
}

/**
 * Track a custom event/metric.
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
  logger.info(`Event: ${name}`, data);

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.addBreadcrumb({ category: 'event', message: name, data, level: 'info' });
      })
      .catch(() => {});
  }
}
