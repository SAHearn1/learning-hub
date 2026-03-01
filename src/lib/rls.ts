/**
 * PostgreSQL Row-Level Security — tenant context helpers.
 *
 * Defence-in-depth: even if application-level RBAC is bypassed,
 * PostgreSQL RLS policies prevent cross-tenant data access.
 *
 * Usage in API route handlers:
 *
 *   import { withTenantRLS } from '@/lib/rls';
 *
 *   export const GET = withAuth(async (req, user) => {
 *     const data = await withTenantRLS(user.tenantId, async (tx) => {
 *       return tx.school.findMany();  // only returns tenant's schools
 *     });
 *     return NextResponse.json(data);
 *   });
 *
 * For platform admins who need cross-tenant access:
 *
 *   import { withRLSBypass } from '@/lib/rls';
 *
 *   const allSchools = await withRLSBypass(async (tx) => {
 *     return tx.school.findMany();
 *   });
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute a callback within a Prisma interactive transaction that sets
 * the PostgreSQL session variable `app.current_tenant_id`.
 *
 * All queries inside the callback are scoped to the given tenant by the
 * RLS policies defined in migration 20260228200000.
 */
export async function withTenantRLS<T>(
  tenantId: string,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

/**
 * Execute a callback with RLS bypassed (for migrations, seeding,
 * or platform-admin cross-tenant operations).
 */
export async function withRLSBypass<T>(
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    return fn(tx);
  });
}
