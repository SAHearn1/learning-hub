import { rateLimitCheck } from './cache';

const CHAT_RATE_LIMIT_MAX = 30; // 30 chat messages per minute
const CHAT_RATE_LIMIT_WINDOW = 60; // 60 seconds

/**
 * Distributed rate limiter for high-value endpoints (chat, assessments).
 * Uses Redis when available; returns null to signal "allow" when Redis
 * is unavailable (the Edge middleware still provides in-memory limiting).
 */
export async function enforceDistributedRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = CHAT_RATE_LIMIT_MAX,
  windowSeconds = CHAT_RATE_LIMIT_WINDOW,
): Promise<{ limited: boolean; remaining: number; resetAtMs: number } | null> {
  const key = `rl:dist:${endpoint}:${identifier}`;
  const result = await rateLimitCheck(key, maxRequests, windowSeconds);

  if (!result) return null; // Redis unavailable, skip distributed check

  return {
    limited: !result.allowed,
    remaining: result.remaining,
    resetAtMs: result.resetAtMs,
  };
}
