// Type declaration for optional @sentry/nextjs dependency.
// This allows dynamic import() calls to pass type-checking
// even when the package is not installed.
declare module '@sentry/nextjs' {
  export function init(options: {
    dsn: string;
    environment?: string;
    tracesSampleRate?: number;
    [key: string]: unknown;
  }): void;
  export function captureException(error: unknown): void;
  export function setContext(name: string, context: Record<string, unknown>): void;
  export function addBreadcrumb(breadcrumb: {
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
    level?: string;
  }): void;
}
