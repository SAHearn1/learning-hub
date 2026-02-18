import crypto from 'crypto';
import { db } from '@/lib/db';

export type AuditWriteInput = {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
};

function hashAuditRecord(payload: {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: unknown;
  timestamp: Date;
  previousHash?: string | null;
}): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export async function appendImmutableAuditLog(input: AuditWriteInput) {
  const previous = await db.auditLog.findFirst({
    where: { tenantId: input.tenantId },
    orderBy: { timestamp: 'desc' },
    select: { chainHash: true },
  });

  const timestamp = new Date();
  const previousHash = previous?.chainHash ?? null;
  const chainHash = hashAuditRecord({ ...input, timestamp, previousHash });

  return db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      metadata: input.metadata as any,
      ipAddress: input.ipAddress,
      timestamp,
      previousHash,
      chainHash,
    },
  });
}


export type CreateAuditLogInput = {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: unknown;
  ipAddress?: string | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return appendImmutableAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    metadata: input.details,
    ipAddress: input.ipAddress,
  });
}
