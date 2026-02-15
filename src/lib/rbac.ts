import type { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { hasPermission } from '@/constants/permissions';

const districtScopedRoles: UserRole[] = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PARENT', 'STUDENT'];

// ============================================================================
// Tenant (District) Scoping
// ============================================================================

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

// ============================================================================
// Classroom Scoping for Educators
// ============================================================================

/**
 * Checks if an educator owns/teaches a specific classroom
 */
export async function isClassroomOwner(educatorUserId: string, classId: string): Promise<boolean> {
  const count = await db.class.count({
    where: { id: classId, educatorId: educatorUserId },
  });

  return count > 0;
}

/**
 * Asserts that an educator owns a specific classroom
 */
export async function assertClassroomOwnership(educatorUserId: string, classId: string): Promise<void> {
  const isOwner = await isClassroomOwner(educatorUserId, classId);
  if (!isOwner) {
    throw new Error('Forbidden: You do not have access to this classroom');
  }
}

/**
 * Gets all classroom IDs that an educator owns
 */
export async function getEducatorClassroomIds(educatorUserId: string): Promise<string[]> {
  const classes = await db.class.findMany({
    where: { educatorId: educatorUserId },
    select: { id: true },
  });

  return classes.map((c: { id: string }) => c.id);
}

// ============================================================================
// School Scoping for School Admins
// ============================================================================

/**
 * Checks if a user belongs to a specific school
 */
export function canAccessSchool(actorRole: UserRole, actorSchoolId: string | null, resourceSchoolId: string): boolean {
  // Platform admins can access all schools
  if (actorRole === 'PLATFORM_ADMIN') {
    return true;
  }

  // District admins can access all schools in their tenant (checked elsewhere)
  if (actorRole === 'DISTRICT_ADMIN') {
    return true;
  }

  // School admins can only access their own school
  if (actorRole === 'SCHOOL_ADMIN') {
    return actorSchoolId === resourceSchoolId;
  }

  return false;
}

/**
 * Asserts that a user can access a specific school
 */
export function assertSchoolAccess(actorRole: UserRole, actorSchoolId: string | null, resourceSchoolId: string): void {
  if (!canAccessSchool(actorRole, actorSchoolId, resourceSchoolId)) {
    throw new Error('Forbidden: You do not have access to this school');
  }
}

// ============================================================================
// Curriculum Management Permissions
// ============================================================================

/**
 * Checks if a user can manage global curriculum (standards, topics)
 * Only PLATFORM_ADMIN can modify global curriculum
 */
export function canManageGlobalCurriculum(userRole: UserRole): boolean {
  return hasPermission(userRole, 'MANAGE_GLOBAL_CURRICULUM');
}

/**
 * Asserts that a user can manage global curriculum
 */
export function assertCanManageGlobalCurriculum(userRole: UserRole): void {
  if (!canManageGlobalCurriculum(userRole)) {
    throw new Error('Forbidden: Only platform administrators can modify global curriculum settings');
  }
}

/**
 * Checks if a user can manage school-level curriculum customizations
 */
export function canManageSchoolCurriculum(userRole: UserRole): boolean {
  return hasPermission(userRole, 'MANAGE_SCHOOL_CURRICULUM');
}

/**
 * Checks if a user can manage classroom learning paths
 * Teachers can only manage their own classrooms
 */
export function canManageClassroomLearningPaths(userRole: UserRole): boolean {
  return hasPermission(userRole, 'MANAGE_CLASSROOM_LEARNING_PATHS');
}

/**
 * Asserts that a user can manage classroom learning paths for a specific classroom
 * For educators, also validates classroom ownership
 */
export async function assertCanManageClassroomLearningPath(
  userId: string,
  userRole: UserRole,
  classId: string
): Promise<void> {
  // Check basic permission
  if (!canManageClassroomLearningPaths(userRole)) {
    throw new Error('Forbidden: You do not have permission to manage classroom learning paths');
  }

  // For educators, verify they own this classroom
  if (userRole === 'EDUCATOR') {
    await assertClassroomOwnership(userId, classId);
  }

  // School admins and district admins can manage any classroom in their scope (validated elsewhere)
  // Platform admins can manage any classroom
}
