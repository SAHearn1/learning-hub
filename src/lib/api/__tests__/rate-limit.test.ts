import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, getClientKey, resetRateLimitStore } from '@/lib/api/rate-limit';

describe('rate limit', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('allows requests under the limit', () => {
    const key = getClientKey('127.0.0.1', '/api/health');
    const first = checkRateLimit(key, 2, 1000);
    const second = checkRateLimit(key, 2, 1001);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks requests once the limit is exceeded', () => {
    const key = getClientKey('127.0.0.1', '/api/health');

    checkRateLimit(key, 1, 1000);
    const blocked = checkRateLimit(key, 1, 1001);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
