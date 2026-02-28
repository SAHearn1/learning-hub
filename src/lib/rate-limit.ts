/**
 * Hybrid rate limiter: Redis-first with in-memory fallback.
 *
 * On Vercel serverless, in-memory state is lost on every cold start,
 * so the primary check goes through Redis (via `rateLimitCheck`).
 * When Redis is unavailable (no REDIS_URL or connection error), the
 * in-memory sliding-window provides a best-effort fallback.
 */

import { rateLimitCheck } from '@/lib/redis/cache';

export interface RateLimitConfig {
  /** Duration of the sliding window in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix-epoch seconds when the oldest entry in the window expires. */
  resetAt: number;
  /** Seconds the caller should wait before retrying (only set when blocked). */
  retryAfterSeconds?: number;
}

// key → sorted array of timestamps (ms)  — fallback only
const buckets = new Map<string, number[]>();

const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of buckets) {
      const cutoff = now - windowMs;
      const pruned = timestamps.filter((t) => t > cutoff);
      if (pruned.length === 0) {
        buckets.delete(key);
      } else {
        buckets.set(key, pruned);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function checkRateLimitInMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  ensureCleanup(config.windowMs);

  const now = Date.now();
  const cutoff = now - config.windowMs;

  let timestamps = buckets.get(key);
  if (!timestamps) {
    timestamps = [];
    buckets.set(key, timestamps);
  }

  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }

  if (timestamps.length >= config.max) {
    const oldest = timestamps[0];
    const resetAt = Math.ceil((oldest + config.windowMs) / 1000);
    const retryAfterSeconds = Math.ceil((oldest + config.windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  timestamps.push(now);

  return {
    allowed: true,
    remaining: config.max - timestamps.length,
    resetAt: Math.ceil((now + config.windowMs) / 1000),
  };
}

/**
 * Check (and consume) one request against the rate limit for `key`.
 * Tries Redis first; falls back to in-memory if Redis is unavailable.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  const redisResult = await rateLimitCheck(`rl:api:${key}`, config.max, windowSeconds);

  if (redisResult) {
    const retryAfterSeconds = redisResult.allowed
      ? undefined
      : Math.max(1, Math.ceil((redisResult.resetAtMs - Date.now()) / 1000));
    return {
      allowed: redisResult.allowed,
      remaining: redisResult.remaining,
      resetAt: Math.ceil(redisResult.resetAtMs / 1000),
      retryAfterSeconds,
    };
  }

  // Redis unavailable — fall back to in-memory
  return checkRateLimitInMemory(key, config);
}

/**
 * Reset rate limit state for a specific key (useful in tests).
 */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Clear all rate limit state (useful in tests).
 */
export function resetAllRateLimits() {
  buckets.clear();
}
