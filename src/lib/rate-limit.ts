/**
 * In-memory sliding-window rate limiter.
 *
 * Keyed by a caller-provided identifier (e.g. IP or userId).
 * Each window tracks timestamps of requests and evicts entries older than
 * `windowMs`.  When the count exceeds `max`, a 429 is signalled.
 *
 * Suitable for single-process / standalone deployments.  For horizontally
 * scaled setups, swap with a Redis-backed implementation behind the same
 * interface.
 */

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

// key → sorted array of timestamps (ms)
const buckets = new Map<string, number[]>();

// Periodically evict stale buckets to prevent memory leaks.
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
  // Allow Node to exit even if the timer is still alive.
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Check (and consume) one request against the rate limit for `key`.
 */
export function checkRateLimit(
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

  // Evict entries outside the window.
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
