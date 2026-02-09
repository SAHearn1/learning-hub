import { db } from '@/lib/db';
import { cacheGet, cacheSet, cacheDel, CACHE_TTL, CACHE_KEY } from './cache';
import { logger } from '@/lib/logger';

/**
 * Cached user + student profile lookup.
 * Called on virtually every authenticated API request.
 */
export async function getCachedUserProfile(clerkUserId: string) {
  const key = CACHE_KEY.userProfile(clerkUserId);

  const cached = await cacheGet<Awaited<ReturnType<typeof fetchUserProfile>>>(key);
  if (cached) {
    logger.debug('Cache HIT: user profile', { clerkUserId });
    return cached;
  }

  const user = await fetchUserProfile(clerkUserId);
  if (user) {
    await cacheSet(key, user, CACHE_TTL.USER_PROFILE);
  }
  return user;
}

async function fetchUserProfile(clerkUserId: string) {
  return db.user.findUnique({
    where: { clerkUserId },
    include: {
      student: {
        include: {
          iepAccommodations: { where: { active: true } },
        },
      },
    },
  });
}

/**
 * Cached session with recent messages.
 * Used by the chat endpoint — high frequency.
 */
export async function getCachedSession(sessionId: string) {
  const key = CACHE_KEY.session(sessionId);

  const cached = await cacheGet<Awaited<ReturnType<typeof fetchSession>>>(key);
  if (cached) {
    logger.debug('Cache HIT: session', { sessionId });
    return cached;
  }

  const session = await fetchSession(sessionId);
  if (session) {
    await cacheSet(key, session, CACHE_TTL.SESSION);
  }
  return session;
}

async function fetchSession(sessionId: string) {
  return db.session.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
  });
}

/**
 * Invalidate session cache after a new message is added.
 */
export async function invalidateSessionCache(sessionId: string): Promise<void> {
  await cacheDel(CACHE_KEY.session(sessionId));
}

/**
 * Invalidate user profile cache (e.g. after IEP update, role change).
 */
export async function invalidateUserProfileCache(clerkUserId: string): Promise<void> {
  await cacheDel(CACHE_KEY.userProfile(clerkUserId));
}

/**
 * Cached tenant usage data for limit enforcement.
 */
export async function getCachedTenantUsage(tenantId: string) {
  const key = CACHE_KEY.tenantUsage(tenantId);

  const cached = await cacheGet<{ totalTokens: number }>(key);
  if (cached) {
    return cached;
  }

  const result = await db.aIUsageLedger.aggregate({
    where: {
      tenantId,
      timestamp: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    _sum: { totalTokens: true },
  });

  const usage = { totalTokens: result._sum?.totalTokens ?? 0 };
  await cacheSet(key, usage, CACHE_TTL.TENANT_USAGE);
  return usage;
}

/**
 * Invalidate tenant usage cache (after new AI usage recorded).
 */
export async function invalidateTenantUsageCache(tenantId: string): Promise<void> {
  await cacheDel(CACHE_KEY.tenantUsage(tenantId));
}
