import { logger } from './logger';

/**
 * Unified error reporting across Sentry + Datadog.
 *
 * Both integrations are optional and lazy-loaded.
 * When neither is configured the structured logger is always active.
 */

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  [key: string]: unknown;
}

interface MonitoringContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentryModule: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSentry(): Promise<any> {
  if (sentryModule) return sentryModule;
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;

  try {
    sentryModule = await import('@sentry/nextjs');
    return sentryModule;
  } catch {
    return null;
  }
}

/**
 * Report an error to the monitoring service.
 * When Sentry is configured (NEXT_PUBLIC_SENTRY_DSN set), errors are sent there.
 * Always logs via structured logger as a fallback.
 */
export function captureError(error: unknown, context?: ErrorContext) {
  logger.error('Captured error', error, context);

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
 * Capture an exception and forward to all configured monitoring backends.
 * Enhanced version that supports Sentry tags/extras and Datadog APM.
 */
export async function captureException(
  error: unknown,
  context?: MonitoringContext,
): Promise<void> {
  // Always log
  logger.error(
    error instanceof Error ? error.message : String(error),
    error,
    { ...context?.extra, tags: context?.tags },
  );

  // Forward to Sentry
  const Sentry = await getSentry();
  if (Sentry?.captureException) {
    try {
      Sentry.captureException(error, {
        tags: {
          ...(context?.tags ?? {}),
          ...(context?.tenantId ? { tenant_id: context.tenantId } : {}),
        },
        extra: context?.extra,
        user: context?.userId ? { id: context.userId } : undefined,
      });
    } catch {
      // Sentry call failed — already logged above
    }
  }

  // Forward to Datadog via dd-trace (if loaded)
  if (process.env.DD_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tracer = require('dd-trace');
      const activeSpan = tracer?.scope?.()?.active?.();
      if (activeSpan && error instanceof Error) {
        activeSpan.setTag('error', true);
        activeSpan.addTags({
          'error.message': error.message,
          'error.stack': error.stack ?? '',
          ...(context?.tags ?? {}),
        });
      }
    } catch {
      // dd-trace not available — skip
    }
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

/**
 * Record a custom metric / breadcrumb (Sentry) or span tag (Datadog).
 */
export async function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>,
): Promise<void> {
  // Sentry breadcrumb
  const Sentry = await getSentry();
  if (Sentry?.addBreadcrumb) {
    Sentry.addBreadcrumb({
      category: 'metric',
      message: name,
      data: { value, ...tags },
      level: 'info',
    });
  }

  // Structured log for Datadog log-based metrics
  logger.info(`metric:${name}`, { value, ...tags });
}

/**
 * Set user context across all monitoring providers.
 */
export async function setMonitoringUser(user: {
  id: string;
  role?: string;
  tenantId?: string;
}): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry?.setUser) {
    Sentry.setUser({ id: user.id });
    if (user.role) Sentry.setTag('user_role', user.role);
    if (user.tenantId) Sentry.setTag('tenant_id', user.tenantId);
  }
}
