import { db } from '@/lib/db';
import { TIER_LIMITS } from '@/lib/billing';

const DEFAULT_DAILY_HARD_LIMIT_TOKENS = 250_000;
const DEFAULT_SPIKE_ALERT_MULTIPLIER = 3;
const DEFAULT_SPIKE_ALERT_MIN_TOKENS = 40_000;
const DEFAULT_BASELINE_MIN_TOKENS = 10_000;

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

  const guardrail = await evaluateOrganizationTokenUsage(tenantId, { additionalTokens: requestedTokens });
  if (guardrail.hardLimitExceeded) {
    throw new UsageLimitError(
      `Daily token limit exceeded for organization ${tenantId}. ` +
        `Projected usage ${guardrail.projectedDailyTokens.toLocaleString()} exceeds ${guardrail.dailyHardLimitTokens.toLocaleString()} tokens.`,
    );
  }

  return snapshot;
}

export interface OrganizationTokenUsageGuardrail {
  organizationId: string;
  tokensLastHour: number;
  tokensLast24Hours: number;
  baselineDailyTokens: number;
  projectedDailyTokens: number;
  dailyHardLimitTokens: number;
  spikeRatio: number;
  hardLimitExceeded: boolean;
  spikeDetected: boolean;
}

export async function evaluateOrganizationTokenUsage(
  organizationId: string,
  options: { additionalTokens?: number; now?: Date } = {},
): Promise<OrganizationTokenUsageGuardrail> {
  const now = options.now ?? new Date();
  const additionalTokens = options.additionalTokens ?? 0;

  const tenant = await db.tenant.findUnique({
    where: { id: organizationId },
    select: { id: true, settings: true },
  });
  if (!tenant) throw new Error('Tenant not found');

  const settings = (tenant.settings as {
    aiUsageHardLimitDailyTokens?: number;
    aiUsageSpikeAlertMultiplier?: number;
    aiUsageSpikeAlertMinTokens?: number;
    aiUsageSpikeBaselineMinTokens?: number;
  } | null) ?? {};

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const baselineStart = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  const [hourAgg, dayAgg, baselineAgg] = await Promise.all([
    db.aIUsageLedger.aggregate({
      where: { tenantId: organizationId, timestamp: { gte: oneHourAgo, lte: now } },
      _sum: { totalTokens: true },
    }),
    db.aIUsageLedger.aggregate({
      where: { tenantId: organizationId, timestamp: { gte: dayAgo, lte: now } },
      _sum: { totalTokens: true },
    }),
    db.aIUsageLedger.aggregate({
      where: { tenantId: organizationId, timestamp: { gte: baselineStart, lt: dayAgo } },
      _sum: { totalTokens: true },
    }),
  ]);

  const tokensLastHour = hourAgg._sum.totalTokens ?? 0;
  const tokensLast24Hours = dayAgg._sum.totalTokens ?? 0;
  const baselineDailyTokensRaw = Math.floor((baselineAgg._sum.totalTokens ?? 0) / 7);
  const baselineFloor = settings.aiUsageSpikeBaselineMinTokens ?? DEFAULT_BASELINE_MIN_TOKENS;
  const baselineDailyTokens = Math.max(baselineDailyTokensRaw, baselineFloor);
  const projectedDailyTokens = tokensLast24Hours + additionalTokens;

  const dailyHardLimitTokens = settings.aiUsageHardLimitDailyTokens ?? DEFAULT_DAILY_HARD_LIMIT_TOKENS;
  const spikeAlertMultiplier = settings.aiUsageSpikeAlertMultiplier ?? DEFAULT_SPIKE_ALERT_MULTIPLIER;
  const spikeAlertMinTokens = settings.aiUsageSpikeAlertMinTokens ?? DEFAULT_SPIKE_ALERT_MIN_TOKENS;

  const spikeRatio = projectedDailyTokens / baselineDailyTokens;
  const hardLimitExceeded = dailyHardLimitTokens > 0 && projectedDailyTokens > dailyHardLimitTokens;
  const spikeDetected = projectedDailyTokens >= spikeAlertMinTokens && spikeRatio >= spikeAlertMultiplier;

  return {
    organizationId,
    tokensLastHour,
    tokensLast24Hours,
    baselineDailyTokens,
    projectedDailyTokens,
    dailyHardLimitTokens,
    spikeRatio,
    hardLimitExceeded,
    spikeDetected,
  };
}
