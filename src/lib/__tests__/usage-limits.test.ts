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
    vi.resetAllMocks();
  });

  it('throws when free tier session limit is reached', async () => {
    const { enforceUsageLimits, UsageLimitError } = await import('../usage-limits');

    mockDb.tenant.findUnique
      .mockResolvedValueOnce({ id: 'tenant_1', subscriptionTier: SubscriptionTier.FREE })
      .mockResolvedValueOnce({ id: 'tenant_1', settings: {} });
    mockDb.session.count.mockResolvedValue(5);
    mockDb.aIUsageLedger.aggregate
      .mockResolvedValueOnce({ _sum: { totalTokens: 1000 } });

    await expect(enforceUsageLimits('tenant_1')).rejects.toBeInstanceOf(UsageLimitError);
  });

  it('allows starter tier with sufficient remaining tokens and no spikes', async () => {
    const { enforceUsageLimits } = await import('../usage-limits');

    mockDb.tenant.findUnique
      .mockResolvedValueOnce({ id: 'tenant_1', subscriptionTier: SubscriptionTier.STARTER })
      .mockResolvedValueOnce({ id: 'tenant_1', settings: {} });
    mockDb.session.count.mockResolvedValue(12);
    mockDb.aIUsageLedger.aggregate
      .mockResolvedValueOnce({ _sum: { totalTokens: 499000 } }) // monthly usage
      .mockResolvedValueOnce({ _sum: { totalTokens: 1000 } }) // last hour
      .mockResolvedValueOnce({ _sum: { totalTokens: 20000 } }) // last 24h
      .mockResolvedValueOnce({ _sum: { totalTokens: 70000 } }); // baseline 7-day

    const result = await enforceUsageLimits('tenant_1', { additionalTokens: 500 });

    expect(result.tier).toBe(SubscriptionTier.STARTER);
  });

  it('flags organization token spikes when projected usage is much higher than baseline', async () => {
    const { evaluateOrganizationTokenUsage } = await import('../usage-limits');

    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'org_1',
      settings: {
        aiUsageSpikeAlertMultiplier: 2,
        aiUsageSpikeAlertMinTokens: 30000,
      },
    });

    mockDb.aIUsageLedger.aggregate
      .mockResolvedValueOnce({ _sum: { totalTokens: 2500 } }) // last hour
      .mockResolvedValueOnce({ _sum: { totalTokens: 50000 } }) // last 24h
      .mockResolvedValueOnce({ _sum: { totalTokens: 70000 } }); // baseline 7-day (10k/day)

    const guardrail = await evaluateOrganizationTokenUsage('org_1', { additionalTokens: 1000 });

    expect(guardrail.spikeDetected).toBe(true);
    expect(guardrail.hardLimitExceeded).toBe(false);
    expect(guardrail.spikeRatio).toBeGreaterThanOrEqual(2);
  });

  it('enforces hard organization daily token limit when projected usage exceeds cap', async () => {
    const { enforceUsageLimits, UsageLimitError } = await import('../usage-limits');

    mockDb.tenant.findUnique
      .mockResolvedValueOnce({ id: 'org_2', subscriptionTier: SubscriptionTier.ENTERPRISE })
      .mockResolvedValueOnce({
        id: 'org_2',
        settings: {
          aiUsageHardLimitDailyTokens: 5000,
        },
      });

    mockDb.session.count.mockResolvedValue(100);
    mockDb.aIUsageLedger.aggregate
      .mockResolvedValueOnce({ _sum: { totalTokens: 1000 } }) // monthly usage
      .mockResolvedValueOnce({ _sum: { totalTokens: 500 } }) // last hour
      .mockResolvedValueOnce({ _sum: { totalTokens: 4900 } }) // last 24h
      .mockResolvedValueOnce({ _sum: { totalTokens: 35000 } }); // baseline 7-day

    await expect(enforceUsageLimits('org_2', { additionalTokens: 200 })).rejects.toBeInstanceOf(UsageLimitError);
  });
});
