import type { UserRole } from '@prisma/client';

const districtScopedRoles: UserRole[] = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PARENT', 'STUDENT'];

export function canAccessTenant(actorRole: UserRole, actorTenantId: string, resourceTenantId: string): boolean {
  if (actorRole === 'PLATFORM_ADMIN') {
    return true;
  }

  if (districtScopedRoles.includes(actorRole)) {
    return actorTenantId === resourceTenantId;
  }

  return false;
}

export function assertTenantAccess(actorRole: UserRole, actorTenantId: string, resourceTenantId: string): void {
  if (!canAccessTenant(actorRole, actorTenantId, resourceTenantId)) {
    throw new Error('Forbidden: cross-district access denied by RBAC policy');
  }
}
