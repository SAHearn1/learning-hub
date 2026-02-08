import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  [key: string]: unknown;
}

/**
 * Report an error to the monitoring service.
 *
 * This project currently uses structured logging as the primary telemetry sink.
 * Keeping this utility centralised makes it easy to re-introduce a vendor SDK
 * (for example Sentry) in one place without touching route handlers.
 */
export function captureError(error: unknown, context?: ErrorContext) {
  logger.error('Captured error', error, context);
}

/**
 * Track a custom event/metric.
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
  logger.info(`Event: ${name}`, data);
}
