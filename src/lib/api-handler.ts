/**
 * Centralised API route handler wrapper.
 *
 * Wraps every Next.js App Router handler to provide:
 *  1. Request-scoped `X-Request-Id` header (generated or forwarded).
 *  2. Structured request/response logging with duration.
 *  3. Optional sliding-window rate limiting.
 *  4. Automatic error → JSON mapping via the `AppError` hierarchy.
 *  5. Observability hooks (`captureError`, `trackEvent`).
 *
 * Usage:
 * ```ts
 * export const GET = withApiHandler(async (req, ctx) => {
 *   const user = await requireUser();     // throws AuthenticationError
 *   return NextResponse.json({ data: user });
 * }, { rateLimit: { windowMs: 60_000, max: 60 } });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AppError,
  RateLimitError,
} from '@/lib/api-errors';
import { checkRateLimit, type RateLimitConfig, type RateLimitResult } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/monitoring';
import { incrementMetric, observeLatency } from '@/lib/api/metrics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context object passed to every handler. */
export interface ApiContext {
  /** Unique request identifier (forwarded or generated). */
  requestId: string;
  /** Resolved dynamic route params (e.g. `{ sessionId: '...' }`). */
  params: Record<string, string>;
}

/**
 * The handler function the caller provides.
 * It receives the raw `NextRequest` plus an `ApiContext` and must return
 * a `NextResponse` (or `Response`).
 */
export type ApiHandlerFn = (
  req: NextRequest,
  ctx: ApiContext,
) => Promise<NextResponse | Response>;

/** Configuration for `withApiHandler`. */
export interface ApiHandlerOptions {
  /** Optional per-route rate limiting. */
  rateLimit?: RateLimitConfig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function errorResponseJson(
  body: Record<string, unknown>,
  status: number,
  requestId: string,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    { ...body, requestId },
    {
      status,
      headers: {
        'X-Request-Id': requestId,
        ...extraHeaders,
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Main wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap a Next.js route handler to get consistent error handling,
 * logging, tracing, and optional rate limiting.
 */
export function withApiHandler(
  handler: ApiHandlerFn,
  options: ApiHandlerOptions = {},
) {
  return async (
    req: NextRequest,
    routeContext: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse | Response> => {
    const requestId =
      req.headers.get('x-request-id') || crypto.randomUUID();
    const startTime = Date.now();
    const method = req.method;
    const pathname = req.nextUrl.pathname;

    incrementMetric('api_requests_total');
    incrementMetric(`api_requests_${method.toLowerCase()}_total`);

    // --- Rate limiting ---------------------------------------------------
    let rateLimitResult: RateLimitResult | null = null;
    if (options.rateLimit) {
      const ip = resolveClientIp(req);
      const key = `${pathname}:${ip}`;
      const result = checkRateLimit(key, options.rateLimit);
      rateLimitResult = result;

      if (!result.allowed) {
        incrementMetric('api_rate_limit_exceeded_total');
        incrementMetric(`api_rate_limit_exceeded_${method.toLowerCase()}_total`);
        logger.warn('Rate limit exceeded', {
          requestId,
          pathname,
          ip,
          retryAfter: result.retryAfterSeconds,
        });
        return errorResponseJson(
          {
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          429,
          requestId,
          {
            'Retry-After': String(result.retryAfterSeconds ?? 60),
            'X-RateLimit-Limit': String(options.rateLimit.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetAt),
          },
        );
      }
    }

    // --- Resolve params ---------------------------------------------------
    let params: Record<string, string> = {};
    try {
      params = await routeContext.params;
    } catch {
      // params resolution failed – leave empty
    }

    // --- Execute handler --------------------------------------------------
    try {
      logger.debug('API request', { requestId, method, pathname });

      const response = await handler(req, { requestId, params });

      // Attach request-id to whatever the handler returned.
      if (response instanceof Response) {
        response.headers.set('X-Request-Id', requestId);
      }

      const durationMs = Date.now() - startTime;
      observeLatency(pathname, durationMs);

      if (options.rateLimit && rateLimitResult) {
        response.headers.set('X-RateLimit-Limit', String(options.rateLimit.max));
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));
      }

      logger.info('API response', {
        requestId,
        method,
        pathname,
        status: response instanceof Response ? response.status : 200,
        durationMs,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // ---- Known application errors ------------------------------------
      if (error instanceof AppError) {
        incrementMetric('api_errors_total');
        incrementMetric(`api_errors_${error.code.toLowerCase()}_total`);
        observeLatency(pathname, durationMs);
        logger.warn('API error', {
          requestId,
          method,
          pathname,
          status: error.statusCode,
          code: error.code,
          message: error.message,
          durationMs,
        });

        const body: Record<string, unknown> = {
          error: error.message,
          code: error.code,
        };
        if (error.details !== undefined) {
          body.details = error.details;
        }

        const extraHeaders: Record<string, string> = {};
        if (error instanceof RateLimitError && error.retryAfterSeconds) {
          extraHeaders['Retry-After'] = String(error.retryAfterSeconds);
        }

        return errorResponseJson(body, error.statusCode, requestId, extraHeaders);
      }

      // ---- Zod validation errors (thrown outside handler's own catch) ---
      if (error instanceof z.ZodError) {
        incrementMetric('api_errors_total');
        incrementMetric('api_errors_validation_error_total');
        observeLatency(pathname, durationMs);
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        logger.warn('API validation error', {
          requestId,
          method,
          pathname,
          details,
          durationMs,
        });
        return errorResponseJson(
          {
            error: 'Invalid request',
            code: 'VALIDATION_ERROR',
            details,
          },
          400,
          requestId,
        );
      }

      // ---- Unexpected errors -------------------------------------------
      captureError(error, { requestId, route: pathname });
      incrementMetric('api_errors_total');
      incrementMetric('api_errors_internal_error_total');
      observeLatency(pathname, durationMs);
      logger.error('Unhandled API error', error, {
        requestId,
        method,
        pathname,
        durationMs,
      });

      return errorResponseJson(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        500,
        requestId,
      );
    }
  };
}
