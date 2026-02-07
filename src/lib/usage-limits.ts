import { db } from '@/lib/db';
import { TIER_LIMITS } from '@/lib/billing';

export class UsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageLimitError';
  }
}

function monthBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function getTenantUsageSnapshot(tenantId: string, now = new Date()) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found');

  const { start, end } = monthBounds(now);

  const [sessionCount, tokenAggregate] = await Promise.all([
    db.session.count({
      where: {
        tenantId,
        startedAt: { gte: start, lt: end },
      },
    }),
    db.aIUsageLedger.aggregate({
      where: {
        tenantId,
        timestamp: { gte: start, lt: end },
      },
      _sum: {
        totalTokens: true,
      },
    }),
  ]);

  const tierLimits = TIER_LIMITS[tenant.subscriptionTier];
  const usedTokens = tokenAggregate._sum.totalTokens ?? 0;

  return {
    tier: tenant.subscriptionTier,
    limits: tierLimits,
    usage: {
      sessionsThisMonth: sessionCount,
      aiTokensThisMonth: usedTokens,
    },
  };
}

export async function enforceUsageLimits(tenantId: string, request: { additionalTokens?: number } = {}) {
  const snapshot = await getTenantUsageSnapshot(tenantId);

  if (
    snapshot.limits.sessionsPerMonth >= 0 &&
    snapshot.usage.sessionsThisMonth >= snapshot.limits.sessionsPerMonth
  ) {
    throw new UsageLimitError('Monthly session limit reached for current subscription tier.');
  }

  const requestedTokens = request.additionalTokens ?? 0;
  if (
    snapshot.limits.aiTokensPerMonth >= 0 &&
    snapshot.usage.aiTokensThisMonth + requestedTokens > snapshot.limits.aiTokensPerMonth
  ) {
    throw new UsageLimitError('Monthly AI token limit exceeded for current subscription tier.');
  }

  return snapshot;
}
