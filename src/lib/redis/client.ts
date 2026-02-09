import Redis from 'ioredis';
import { logger } from '@/lib/logger';

let redis: Redis | null = null;

/**
 * Returns a singleton Redis client.
 * Falls back gracefully when REDIS_URL is not configured — all cache
 * operations become no-ops so the app works without Redis in development.
 */
export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (redis) return redis;

  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 200, 2000);
    },
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', err);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  // Connect asynchronously — don't block startup
  redis.connect().catch((err) => {
    logger.error('Redis initial connect failed', err);
    redis = null;
  });

  return redis;
}

/**
 * Disconnect Redis gracefully (for shutdown hooks).
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
