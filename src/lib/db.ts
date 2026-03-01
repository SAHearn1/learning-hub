import { PrismaClient, Prisma } from '@prisma/client';
import { getTenantContext } from '@/lib/tenant-context';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** Operations that should never be wrapped in an RLS transaction. */
const RAW_OPS = new Set([
  '$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe',
  '$runCommandRaw', 'aggregate', 'groupBy', 'count',
]);

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  });

  return base.$extends({
    query: {
      async $allOperations({ args, query, operation }) {
        const ctx = getTenantContext();

        // No store, or tenantId not yet resolved → passthrough.
        // This covers: migrations, seeding, early auth queries, public routes.
        if (!ctx?.tenantId && !ctx?.bypass) return query(args);

        // Raw / aggregate operations → passthrough.
        if (RAW_OPS.has(operation)) return query(args);

        // Wrap in a mini-transaction that sets the PostgreSQL RLS variable.
        const client = Prisma.getExtensionContext(this) as unknown as PrismaClient;
        return client.$transaction(async (tx) => {
          if (ctx.bypass) {
            await tx.$queryRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
          } else {
            await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${ctx.tenantId!}, true)`;
          }
          return query(args);
        });
      },
    },
  }) as unknown as PrismaClient;
}

export const db = globalForPrisma.prisma || createPrismaClient();

// Backward-compatible alias used across older modules.
export const prisma = db;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export { createPrismaClient };
