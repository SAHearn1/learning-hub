import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionTier } from '@prisma/client';

const mockDb = {
  tenant: { findUnique: vi.fn() },
  session: { count: vi.fn() },
  aIUsageLedger: { aggregate: vi.fn() },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

describe('usage limit enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when free tier session limit is reached', async () => {
    const { enforceUsageLimits, UsageLimitError } = await import('../usage-limits');

    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant_1', subscriptionTier: SubscriptionTier.FREE });
    mockDb.session.count.mockResolvedValue(5);
    mockDb.aIUsageLedger.aggregate.mockResolvedValue({ _sum: { totalTokens: 1000 } });

    await expect(enforceUsageLimits('tenant_1')).rejects.toBeInstanceOf(UsageLimitError);
  });

  it('allows starter tier with sufficient remaining tokens', async () => {
    const { enforceUsageLimits } = await import('../usage-limits');

    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant_1', subscriptionTier: SubscriptionTier.STARTER });
    mockDb.session.count.mockResolvedValue(12);
    mockDb.aIUsageLedger.aggregate.mockResolvedValue({ _sum: { totalTokens: 499000 } });

    const result = await enforceUsageLimits('tenant_1', { additionalTokens: 500 });

    expect(result.tier).toBe(SubscriptionTier.STARTER);
  });
});
