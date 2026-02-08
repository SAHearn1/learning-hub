const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 120;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export function getClientKey(ip: string | null, path: string): string {
  return `${ip ?? 'unknown'}:${path}`;
}

export function checkRateLimit(key: string, maxRequests = DEFAULT_MAX_REQUESTS, now = Date.now()) {
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, next);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: next.resetAt,
      limit: maxRequests,
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      limit: maxRequests,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetAt,
    limit: maxRequests,
  };
}

export function resetRateLimitStore() {
  store.clear();
}

export const rateLimitDefaults = {
  WINDOW_MS,
  DEFAULT_MAX_REQUESTS,
};
