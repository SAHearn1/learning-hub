/**
 * Request-scoped tenant context via AsyncLocalStorage.
 *
 * Flow:
 *  1. `withApiHandler` creates an empty store via `tenantStorage.run()`.
 *  2. `requireUser()` / `requireRole()` resolve the user and populate
 *     the store with `tenantId` (and optionally `bypass` for admins).
 *  3. The Prisma `$extends` hook in `db.ts` reads the store and sets
 *     `SET LOCAL app.current_tenant_id` on every subsequent query.
 *
 * Routes that never call `requireUser()` (public, webhooks, cron)
 * have an empty store so all queries pass through without RLS.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  /** Tenant ID for RLS filtering. Undefined until auth resolves. */
  tenantId?: string;
  /** When true, sets app.bypass_rls = 'on' (platform admin / cron). */
  bypass?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/** Get the current tenant context, or null if not in a request scope. */
export function getTenantContext(): TenantStore | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Set the tenant ID in the current request's store.
 * Called by `requireUser()` after authentication succeeds.
 */
export function setTenantId(tenantId: string, bypass = false): void {
  const store = tenantStorage.getStore();
  if (store) {
    store.tenantId = tenantId;
    store.bypass = bypass;
  }
}
