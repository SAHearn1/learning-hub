import { afterEach, describe, expect, it } from 'vitest';
import { checkRateLimit, resetAllRateLimits } from '../rate-limit';

afterEach(() => {
  resetAllRateLimits();
});

describe('checkRateLimit', () => {
  const config = { windowMs: 60_000, max: 3 };

  it('allows requests within the limit', async () => {
    const r1 = await checkRateLimit('user:1', config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit('user:1', config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit('user:1', config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests beyond the limit', async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('user:2', config);
    }

    const blocked = await checkRateLimit('user:2', config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('uses independent buckets per key', async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('user:a', config);
    }

    const blockedA = await checkRateLimit('user:a', config);
    expect(blockedA.allowed).toBe(false);

    const allowedB = await checkRateLimit('user:b', config);
    expect(allowedB.allowed).toBe(true);
    expect(allowedB.remaining).toBe(2);
  });

  it('provides a resetAt timestamp in the future', async () => {
    const now = Math.floor(Date.now() / 1000);
    const result = await checkRateLimit('user:3', config);
    expect(result.resetAt).toBeGreaterThanOrEqual(now);
  });

  it('resets after clearing', async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('user:4', config);
    }
    expect((await checkRateLimit('user:4', config)).allowed).toBe(false);

    resetAllRateLimits();

    expect((await checkRateLimit('user:4', config)).allowed).toBe(true);
  });
});
