import { getRedisClient } from './client';
import { logger } from '@/lib/logger';

/** Default TTLs in seconds */
export const CACHE_TTL = {
  /** User/student profile lookups — moderate staleness OK */
  USER_PROFILE: 300, // 5 min
  /** Session data — shorter TTL since it changes per message */
  SESSION: 60, // 1 min
  /** Assessment results — rarely change */
  ASSESSMENT: 600, // 10 min
  /** AI response cache — keyed by content hash */
  AI_RESPONSE: 1800, // 30 min
  /** Curriculum/RAG context — changes only on ingest */
  CURRICULUM: 3600, // 1 hour
  /** Rate limiting window */
  RATE_LIMIT: 60, // 1 min
  /** Tenant usage/limits */
  TENANT_USAGE: 120, // 2 min
} as const;

/** Key prefixes for namespacing */
export const CACHE_KEY = {
  userProfile: (clerkId: string) => `user:profile:${clerkId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  sessionMessages: (sessionId: string) => `session:msgs:${sessionId}`,
  assessment: (assessmentId: string) => `assessment:${assessmentId}`,
  aiResponse: (hash: string) => `ai:resp:${hash}`,
  rateLimit: (ip: string, path: string) => `rl:${ip}:${path}`,
  tenantUsage: (tenantId: string) => `tenant:usage:${tenantId}`,
  curriculum: (subject: string, grade: string, queryHash: string) =>
    `rag:${subject}:${grade}:${queryHash}`,
} as const;

/**
 * Get a cached value, deserialised from JSON.
 * Returns null on miss or when Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error('Cache GET failed', err, { key });
    return null;
  }
}

/**
 * Set a cached value with TTL (seconds).
 * Silently fails when Redis is unavailable.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.error('Cache SET failed', err, { key });
  }
}

/**
 * Delete one or more cache keys.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  const client = getRedisClient();
  if (!client || keys.length === 0) return;

  try {
    await client.del(...keys);
  } catch (err) {
    logger.error('Cache DEL failed', err, { keys });
  }
}

/**
 * Invalidate all keys matching a pattern (e.g. "session:abc*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.error('Cache invalidate pattern failed', err, { pattern });
  }
}

/**
 * Atomic rate-limit check using Redis INCR + EXPIRE.
 * Returns { allowed: boolean, remaining: number, resetAt: number }.
 */
export async function rateLimitCheck(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAtMs: number } | null> {
  const client = getRedisClient();
  if (!client) return null; // fall back to in-memory

  try {
    const multi = client.multi();
    multi.incr(key);
    multi.ttl(key);
    const results = await multi.exec();

    if (!results) return null;

    const count = results[0][1] as number;
    const ttl = results[1][1] as number;

    // Set expiry on first request in the window
    if (count === 1 || ttl === -1) {
      await client.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, maxRequests - count);
    const resetAtMs = Date.now() + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000);

    return {
      allowed: count <= maxRequests,
      remaining,
      resetAtMs,
    };
  } catch (err) {
    logger.error('Rate limit check failed', err, { key });
    return null; // fall back to in-memory
  }
}

/**
 * Simple content hash for cache keys (not cryptographic).
 */
export function contentHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
