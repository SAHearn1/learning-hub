import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { createDistrictInvoice } from '@/lib/billing';

export async function getSuperAdminDashboardData() {
  const [tenants, sessionAgg, tokenAgg, monthlyRevenueEstimate, recentAuditEvents] = await Promise.all([
    db.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            schools: true,
            aiUsageLedger: true,
          },
        },
      },
    }),
    db.session.groupBy({
      by: ['tenantId'],
      _count: { _all: true },
      where: {
        startedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    db.aIUsageLedger.groupBy({
      by: ['tenantId'],
      _sum: { totalTokens: true, costUSD: true },
      where: {
        timestamp: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    db.aIUsageLedger.aggregate({
      _sum: { costUSD: true },
      where: {
        timestamp: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    db.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 12,
      select: {
        id: true,
        tenantId: true,
        action: true,
        resource: true,
        timestamp: true,
      },
    }),
  ]);

  const sessionsByTenant = new Map(sessionAgg.map((entry) => [entry.tenantId, entry._count._all]));
  const usageByTenant = new Map(tokenAgg.map((entry) => [entry.tenantId, entry]));

  const tenantRows = tenants.map((tenant) => {
    const usage = usageByTenant.get(tenant.id);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      subscriptionTier: tenant.subscriptionTier,
      subscriptionStatus: tenant.subscriptionStatus,
      isSuspended: tenant.isSuspended,
      suspendedAt: tenant.suspendedAt,
      suspensionReason: tenant.suspensionReason,
      users: tenant._count.users,
      schools: tenant._count.schools,
      sessionCountThisMonth: sessionsByTenant.get(tenant.id) ?? 0,
      tokenCountThisMonth: usage?._sum.totalTokens ?? 0,
      aiCostUsdThisMonth: Number(usage?._sum.costUSD ?? 0),
    };
  });

  return {
    summary: {
      tenantCount: tenants.length,
      suspendedTenantCount: tenantRows.filter((row) => row.isSuspended).length,
      sessionsThisMonth: tenantRows.reduce((sum, row) => sum + row.sessionCountThisMonth, 0),
      aiTokensThisMonth: tenantRows.reduce((sum, row) => sum + row.tokenCountThisMonth, 0),
      aiCostUsdThisMonth: Number(monthlyRevenueEstimate._sum.costUSD ?? 0),
    },
    tenantRows,
    recentAuditEvents,
  };
}

export async function setTenantSuspension(params: {
  tenantId: string;
  actorUserId: string;
  suspend: boolean;
  reason?: string;
}) {
  const { tenantId, actorUserId, suspend, reason } = params;

  const updated = await db.tenant.update({
    where: { id: tenantId },
    data: {
      isSuspended: suspend,
      suspendedAt: suspend ? new Date() : null,
      suspensionReason: suspend ? reason ?? 'Suspended by platform administrator.' : null,
    },
  });

  await db.auditLog.create({
    data: {
      tenantId,
      userId: actorUserId,
      action: suspend ? 'TENANT_SUSPENDED' : 'TENANT_RESTORED',
      resource: 'Tenant',
      resourceId: tenantId,
      chainHash: randomUUID(),
      metadata: {
        reason,
      },
    },
  });

  return updated;
}

export async function createManualIntervention(params: {
  tenantId: string;
  actorUserId: string;
  summary: string;
  details?: string;
}) {
  const intervention = await db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.actorUserId,
      action: 'MANUAL_DATA_INTERVENTION',
      resource: 'TenantData',
      resourceId: params.tenantId,
      chainHash: randomUUID(),
      metadata: {
        summary: params.summary,
        details: params.details,
      },
    },
  });

  return intervention;
}

export async function issueDistrictInvoice(params: {
  tenantId: string;
  actorUserId: string;
  actorEmail?: string;
  memo?: string;
  lineItems: Array<{ description: string; unitAmountCents: number; quantity?: number }>;
}) {
  return createDistrictInvoice({
    tenantId: params.tenantId,
    initiatedByUserId: params.actorUserId,
    email: params.actorEmail,
    memo: params.memo,
    lineItems: params.lineItems,
    collectionMethod: 'send_invoice',
    daysUntilDue: 30,
  });
}
