# Role-Based Access Control (RBAC) System

This document describes the granular RBAC implementation for the Learning Hub platform, with specific focus on curriculum management permissions.

## Table of Contents
- [Overview](#overview)
- [Role Hierarchy](#role-hierarchy)
- [Permission Model](#permission-model)
- [Middleware Usage](#middleware-usage)
- [API Route Protection](#api-route-protection)
- [Examples](#examples)

## Overview

The Learning Hub RBAC system provides granular access control with the following key features:

1. **Role-based permissions** - Different roles have different capabilities
2. **Resource ownership** - Teachers can only manage their own classrooms
3. **Scope isolation** - Multi-tenant isolation (district/tenant level)
4. **Curriculum granularity** - Differentiation between global and classroom-specific curriculum management

### Key Principle

**Teachers (EDUCATOR role) can modify their classroom's specific learning paths, but CANNOT modify global curriculum settings.**

Only SuperAdmins (PLATFORM_ADMIN role) can modify global curriculum standards and topics.

---

## Role Hierarchy

### Roles

| Role | Description | Scope |
|------|-------------|-------|
| **PLATFORM_ADMIN** | SuperAdmin with full system access | Platform-wide |
| **DISTRICT_ADMIN** | District/tenant administrator | Tenant-wide |
| **SCHOOL_ADMIN** | School-level administrator | School-wide |
| **EDUCATOR** | Teacher/instructor | Classroom-level |
| **PARENT** | Parent/guardian | Child's data only |
| **STUDENT** | Individual learner | Own data only |

### Role Mapping

For clarity in this RBAC implementation:
- **SuperAdmin** = `PLATFORM_ADMIN`
- **SchoolAdmin** = `SCHOOL_ADMIN` + `DISTRICT_ADMIN`
- **Teacher** = `EDUCATOR`
- **Student** = `STUDENT`

---

## Permission Model

### Curriculum Management Permissions

| Permission | Roles | Description |
|------------|-------|-------------|
| **MANAGE_GLOBAL_CURRICULUM** | `PLATFORM_ADMIN` | Modify global curriculum standards and topics (create, update, delete) |
| **MANAGE_SCHOOL_CURRICULUM** | `SCHOOL_ADMIN`, `DISTRICT_ADMIN`, `PLATFORM_ADMIN` | Customize curriculum at school level |
| **MANAGE_CLASSROOM_LEARNING_PATHS** | `EDUCATOR`, `SCHOOL_ADMIN`, `DISTRICT_ADMIN`, `PLATFORM_ADMIN` | Customize learning paths for specific classrooms |
| **VIEW_CURRICULUM** | All authenticated users | View curriculum content |

### Other Key Permissions

| Permission | Roles |
|------------|-------|
| **VIEW_OWN_PROGRESS** | `STUDENT`, `PARENT` |
| **VIEW_STUDENT_DATA** | `EDUCATOR`, `SCHOOL_ADMIN`, `DISTRICT_ADMIN`, `PLATFORM_ADMIN` |
| **MANAGE_CLASSES** | `EDUCATOR`, `SCHOOL_ADMIN`, `DISTRICT_ADMIN` |
| **MANAGE_IEP** | `EDUCATOR`, `SCHOOL_ADMIN` |
| **VIEW_COMPLIANCE** | `EDUCATOR`, `SCHOOL_ADMIN`, `DISTRICT_ADMIN`, `PLATFORM_ADMIN` |
| **MANAGE_BILLING** | `SCHOOL_ADMIN`, `DISTRICT_ADMIN`, `PLATFORM_ADMIN` |
| **MANAGE_TENANT** | `DISTRICT_ADMIN`, `PLATFORM_ADMIN` |

---

## Middleware Usage

The RBAC middleware is located at `/src/lib/middleware/rbac-middleware.ts` and provides several protection wrappers for API routes.

### Available Middleware

#### 1. `withAuth(handler)`
Basic authentication - ensures user is logged in.

```typescript
import { withAuth } from '@/lib/middleware/rbac-middleware';

export const GET = withAuth(async (req, user) => {
  // user is authenticated
  return NextResponse.json({ userId: user.id });
});
```

#### 2. `withPermission(permission, handler)`
Permission-based protection - ensures user has specific permission.

```typescript
import { withPermission } from '@/lib/middleware/rbac-middleware';

export const GET = withPermission('VIEW_STUDENT_DATA', async (req, user) => {
  // user has VIEW_STUDENT_DATA permission
  return NextResponse.json({ data: 'student data' });
});
```

#### 3. `withRole(roles, handler)`
Role-based protection - ensures user has one of the required roles.

```typescript
import { withRole } from '@/lib/middleware/rbac-middleware';

export const POST = withRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN'], async (req, user) => {
  // user is either SCHOOL_ADMIN or DISTRICT_ADMIN
  return NextResponse.json({ success: true });
});
```

#### 4. `withGlobalCurriculumAccess(handler)` 🔒
Protects global curriculum management routes - **PLATFORM_ADMIN ONLY**.

```typescript
import { withGlobalCurriculumAccess } from '@/lib/middleware/rbac-middleware';

export const POST = withGlobalCurriculumAccess(async (req, user) => {
  // Only PLATFORM_ADMIN can access this route
  // Teachers CANNOT modify global curriculum
  return NextResponse.json({ success: true });
});
```

#### 5. `withSchoolCurriculumAccess(handler)`
Protects school-level curriculum customization routes.

```typescript
import { withSchoolCurriculumAccess } from '@/lib/middleware/rbac-middleware';

export const PATCH = withSchoolCurriculumAccess(async (req, user) => {
  // SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN can access
  return NextResponse.json({ success: true });
});
```

#### 6. `withClassroomAccess(handler)` ✅
Protects classroom learning path routes - validates ownership for Teachers.

```typescript
import { withClassroomAccess } from '@/lib/middleware/rbac-middleware';

export const PATCH = withClassroomAccess(async (req, user, context) => {
  const classId = context?.params?.classId;

  // Teachers can ONLY access their own classrooms
  // The middleware automatically validates classroom ownership
  return NextResponse.json({ success: true });
});
```

#### 7. `withTenantScope(handler)`
Validates tenant access - prevents cross-tenant data access.

```typescript
import { withTenantScope } from '@/lib/middleware/rbac-middleware';

export const GET = withTenantScope(async (req, user) => {
  // Validates user can access resources in their tenant
  return NextResponse.json({ data: 'tenant data' });
});
```

---

## API Route Protection

### Global Curriculum Routes (SuperAdmin Only)

These routes are protected by `withGlobalCurriculumAccess` middleware:

| Route | Method | Description | Access |
|-------|--------|-------------|--------|
| `/api/curriculum/standards` | POST | Create global standard | PLATFORM_ADMIN only |
| `/api/curriculum/standards` | PATCH | Update global standard | PLATFORM_ADMIN only |
| `/api/curriculum/standards` | DELETE | Delete global standard | PLATFORM_ADMIN only |
| `/api/curriculum/topics` | POST | Create global topic | PLATFORM_ADMIN only |
| `/api/curriculum/topics` | PATCH | Update global topic | PLATFORM_ADMIN only |
| `/api/curriculum/topics` | DELETE | Delete global topic | PLATFORM_ADMIN only |

**Important**: Teachers (EDUCATOR role) **CANNOT** access these routes. Attempts to modify global curriculum will be rejected with HTTP 403 Forbidden.

### Classroom Learning Path Routes (Teacher Access)

These routes are protected by `withClassroomAccess` middleware:

| Route | Method | Description | Access |
|-------|--------|-------------|--------|
| `/api/classroom/[classId]/learning-path` | GET | View classroom learning path | EDUCATOR (own classrooms), admins |
| `/api/classroom/[classId]/learning-path` | PATCH | Update classroom learning path | EDUCATOR (own classrooms), admins |
| `/api/classroom/[classId]/learning-path` | POST | Reset to default learning path | EDUCATOR (own classrooms), admins |

**Important**: Teachers can **ONLY** modify learning paths for classrooms they own. The middleware automatically validates classroom ownership.

---

## Examples

### Example 1: Teacher Accessing Their Own Classroom

```typescript
// Teacher with userId = "teacher-123" owns classId = "class-abc"

// ✅ ALLOWED - Teacher can view their own classroom's learning path
GET /api/classroom/class-abc/learning-path
// Response: 200 OK

// ✅ ALLOWED - Teacher can update their own classroom's learning path
PATCH /api/classroom/class-abc/learning-path
// Body: { "standardIds": ["std-1", "std-2"], "adaptiveSettings": { "minMasteryLevel": 85 } }
// Response: 200 OK
```

### Example 2: Teacher Trying to Access Another Classroom

```typescript
// Teacher with userId = "teacher-123" does NOT own classId = "class-xyz"

// ❌ FORBIDDEN - Teacher cannot access another teacher's classroom
GET /api/classroom/class-xyz/learning-path
// Response: 403 Forbidden
// Error: "Forbidden: You do not have access to this classroom"
```

### Example 3: Teacher Trying to Modify Global Curriculum

```typescript
// Teacher with userId = "teacher-123" has EDUCATOR role

// ❌ FORBIDDEN - Teacher cannot create global standards
POST /api/curriculum/standards
// Body: { "code": "CCSS.MATH.1.NBT.A.1", ... }
// Response: 403 Forbidden
// Error: "Forbidden: Only platform administrators can modify global curriculum settings"

// ❌ FORBIDDEN - Teacher cannot update global topics
PATCH /api/curriculum/topics
// Response: 403 Forbidden
```

### Example 4: SuperAdmin Managing Global Curriculum

```typescript
// User with role = PLATFORM_ADMIN

// ✅ ALLOWED - SuperAdmin can create global standards
POST /api/curriculum/standards
// Body: { "code": "CCSS.MATH.1.NBT.A.1", ... }
// Response: 201 Created

// ✅ ALLOWED - SuperAdmin can update global topics
PATCH /api/curriculum/topics
// Body: { "id": "topic-123", "name": "Updated Topic Name" }
// Response: 200 OK

// ✅ ALLOWED - SuperAdmin can also manage any classroom
PATCH /api/classroom/any-class-id/learning-path
// Response: 200 OK
```

### Example 5: School Admin Managing Classroom

```typescript
// User with role = SCHOOL_ADMIN, schoolId = "school-456"

// ✅ ALLOWED - School admin can manage classrooms in their school
PATCH /api/classroom/class-in-school-456/learning-path
// Response: 200 OK

// ❌ FORBIDDEN - School admin cannot modify global curriculum
POST /api/curriculum/standards
// Response: 403 Forbidden
```

---

## Helper Functions

### Permission Checks

```typescript
import { hasPermission } from '@/constants/permissions';

const canManage = hasPermission(user.role, 'MANAGE_GLOBAL_CURRICULUM');
// Returns: true for PLATFORM_ADMIN, false for EDUCATOR
```

### Curriculum Management

```typescript
import {
  canManageGlobalCurriculum,
  canManageSchoolCurriculum,
  canManageClassroomLearningPaths,
} from '@/lib/rbac';

// Check if user can manage global curriculum
const canManageGlobal = canManageGlobalCurriculum(user.role);
// Returns: true only for PLATFORM_ADMIN

// Check if user can manage school curriculum
const canManageSchool = canManageSchoolCurriculum(user.role);
// Returns: true for SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN

// Check if user can manage classroom learning paths
const canManageClassroom = canManageClassroomLearningPaths(user.role);
// Returns: true for EDUCATOR, SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN
```

### Classroom Ownership

```typescript
import { isClassroomOwner, assertClassroomOwnership } from '@/lib/rbac';

// Check if educator owns a classroom (returns boolean)
const isOwner = await isClassroomOwner(educatorUserId, classId);

// Assert classroom ownership (throws error if not owner)
await assertClassroomOwnership(educatorUserId, classId);
// Throws: "Forbidden: You do not have access to this classroom" if not owner
```

---

## Testing

To test the RBAC implementation:

1. **Create test users** with different roles (PLATFORM_ADMIN, EDUCATOR, etc.)
2. **Test global curriculum routes** with each role
3. **Test classroom routes** with ownership checks
4. **Verify error responses** for unauthorized access

### Example Test Scenarios

1. ✅ PLATFORM_ADMIN can create/update/delete global standards
2. ✅ PLATFORM_ADMIN can modify any classroom's learning path
3. ✅ EDUCATOR can view and modify their own classroom's learning path
4. ❌ EDUCATOR cannot create/update/delete global standards
5. ❌ EDUCATOR cannot modify another teacher's classroom learning path
6. ✅ SCHOOL_ADMIN can modify classrooms in their school
7. ❌ SCHOOL_ADMIN cannot modify global curriculum

---

## Summary

This RBAC implementation ensures:

1. **SuperAdmins (PLATFORM_ADMIN)** have full control over global curriculum and all classrooms
2. **SchoolAdmins (SCHOOL_ADMIN, DISTRICT_ADMIN)** can manage classrooms in their scope but not global curriculum
3. **Teachers (EDUCATOR)** can customize their classroom's learning paths but **CANNOT** modify global curriculum settings
4. **Students (STUDENT)** can only access their own learning data

The middleware automatically enforces these rules, preventing unauthorized access and ensuring data security across the platform.
