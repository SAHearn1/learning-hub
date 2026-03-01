/**
 * PostgreSQL Row-Level Security — explicit transaction helpers.
 *
 * For most API routes, RLS is handled automatically:
 *   - `withApiHandler` creates the AsyncLocalStorage scope
 *   - `requireUser()` populates the tenant ID
 *   - The Prisma `$extends` hook in `db.ts` sets the session variable
 *
 * Use these helpers ONLY for code that runs outside `withApiHandler`
 * (e.g. scripts, cron jobs, manual admin operations).
 */

import { db } from '@/lib/db';

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Execute a callback within a Prisma interactive transaction that sets
 * the PostgreSQL session variable `app.current_tenant_id`.
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
