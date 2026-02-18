import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/constants/permissions';
import {
  canAccessTenant,
  canManageGlobalCurriculum,
  canManageSchoolCurriculum,
  canManageClassroomLearningPaths,
  assertCanManageClassroomLearningPath,
  assertCanManageGlobalCurriculum,
  assertClassroomOwnership,
  assertSchoolAccess,
  assertTenantAccess,
} from '@/lib/rbac';
import type { UserRole } from '@prisma/client';

// ============================================================================
// Type Definitions
// ============================================================================

export type PermissionKey = keyof typeof PERMISSIONS;

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  tenantId: string;
  schoolId: string | null;
  clerkUserId: string;
}

export type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export type AuthenticatedRouteHandler = (
  req: NextRequest,
  user: AuthenticatedUser,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

async function resolveParams(context?: {
  params: Promise<Record<string, string>>;
}): Promise<Record<string, string> | undefined> {
  if (!context?.params) {
    return undefined;
  }

  return context.params;
}

// ============================================================================
// Core Middleware Functions
// ============================================================================

/**
 * Extracts authenticated user from request
 */
async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (!user.tenantId) {
    throw new Error('User does not belong to a tenant');
  }

  return {
    id: user.id,
    role: user.role,
    tenantId: user.tenantId,
    schoolId: user.schoolId,
    clerkUserId: user.clerkUserId,
  };
}

/**
 * Basic authentication middleware - ensures user is logged in
 */
export function withAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();
      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return NextResponse.json({ error: message }, { status: 401 });
    }
  };
}

/**
 * Permission-based middleware - ensures user has required permission
 */
export function withPermission(permission: PermissionKey, handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();

      if (!hasPermission(user.role, permission)) {
        return NextResponse.json(
          { error: `Forbidden: ${permission} permission required` },
          { status: 403 }
        );
      }

      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      const status = message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

/**
 * Role-based middleware - ensures user has one of the required roles
 */
export function withRole(roles: UserRole[], handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();

      if (!roles.includes(user.role)) {
        return NextResponse.json(
          { error: `Forbidden: One of ${roles.join(', ')} role required` },
          { status: 403 }
        );
      }

      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      const status = message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

// ============================================================================
// Curriculum Management Middleware
// ============================================================================

/**
 * Middleware for global curriculum management routes
 * Only PLATFORM_ADMIN can access these routes
 */
export function withGlobalCurriculumAccess(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();

      assertCanManageGlobalCurriculum(user.role);

      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      const status = message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

/**
 * Middleware for school curriculum customization routes
 * SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN can access
 */
export function withSchoolCurriculumAccess(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();

      if (!canManageSchoolCurriculum(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to manage school curriculum' },
          { status: 403 }
        );
      }

      // If school ID is provided in context, validate school access
      const params = await resolveParams(context);
      const schoolId = params?.schoolId;
      if (schoolId && user.role === 'SCHOOL_ADMIN') {
        assertSchoolAccess(user.role, user.schoolId, schoolId);
      }

      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      const status = message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

/**
 * Middleware for classroom learning path management routes
 * Educators can only access their own classrooms
 * SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN can access all classrooms in their scope
 */
export function withClassroomAccess(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();

      if (!canManageClassroomLearningPaths(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to manage classroom learning paths' },
          { status: 403 }
        );
      }

      // If class ID is provided in context, validate classroom access
      const params = await resolveParams(context);
      const classId = params?.classId || params?.id;
      if (classId) {
        await assertCanManageClassroomLearningPath(user.id, user.role, classId);
      }

      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      const status = message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

// ============================================================================
// Tenant Scoping Middleware
// ============================================================================

/**
 * Middleware that validates tenant access
 * Prevents cross-tenant data access
 */
export function withTenantScope(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getAuthenticatedUser();

      // Extract tenant ID from request (query param or body)
      let resourceTenantId: string | null = null;

      if (req.method === 'GET') {
        const url = new URL(req.url);
        resourceTenantId = url.searchParams.get('tenantId');
      } else {
        try {
          const body = await req.json();
          resourceTenantId = body.tenantId;
        } catch {
          // Body might not be JSON or might be empty
        }
      }

      if (resourceTenantId) {
        assertTenantAccess(user.role, user.tenantId, resourceTenantId);
      }

      return await handler(req, user, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      const status = message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

// ============================================================================
// Composite Middleware Helper
// ============================================================================

/**
 * Combines multiple middleware functions
 * Usage: compose(withAuth, withPermission('VIEW_STUDENT_DATA'), withTenantScope)(handler)
 */
export function compose(...middlewares: ((handler: RouteHandler) => RouteHandler)[]): (handler: AuthenticatedRouteHandler) => RouteHandler {
  return (handler: AuthenticatedRouteHandler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped as RouteHandler),
      handler as unknown as RouteHandler
    );
  };
}

// ============================================================================
// Convenience Exports
// ============================================================================

export {
  canManageGlobalCurriculum,
  canManageSchoolCurriculum,
  canManageClassroomLearningPaths,
  assertCanManageClassroomLearningPath,
  assertCanManageGlobalCurriculum,
  assertClassroomOwnership,
};
