import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { AuthenticationError, ForbiddenError } from '@/lib/api-errors';
import { setTenantId } from '@/lib/tenant-context';

const USER_INCLUDE = {
  student: {
    include: {
      iepAccommodations: { where: { active: true } },
    },
  },
  educator: true,
  parent: true,
  tenant: true,
} as const;

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: USER_INCLUDE,
  });

  // Auto-provision: if Clerk user exists but no DB record, create one
  if (!user) {
    user = await autoProvisionUser(userId);
  }

  return user;
}

async function autoProvisionUser(clerkUserId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Get or create default tenant
  let tenant = await db.tenant.findFirst({ where: { slug: 'default' } });
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: 'Default Tenant',
        slug: 'default',
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
    });
  }

  const metaRole = clerkUser.publicMetadata?.role as string | undefined;
  const validRoles = ['STUDENT', 'EDUCATOR', 'PARENT', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];
  const role = (metaRole && validRoles.includes(metaRole) ? metaRole : 'STUDENT') as
    'STUDENT' | 'EDUCATOR' | 'PARENT' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN' | 'PLATFORM_ADMIN';

  const newUser = await db.user.create({
    data: {
      clerkUserId,
      tenantId: tenant.id,
      email,
      firstName: clerkUser.firstName ?? 'User',
      lastName: clerkUser.lastName ?? '',
      role,
    },
  });

  // Create role-specific profile
  if (role === 'STUDENT') {
    await db.student.create({
      data: {
        userId: newUser.id,
        gradeLevel: 6,
        learningPreferences: {},
        regulationProfile: {
          dysregulationTriggers: [],
          calmingStrategies: [],
          preferredBreakDuration: 5,
        },
      },
    });
  } else if (role === 'EDUCATOR') {
    await db.educator.create({
      data: {
        userId: newUser.id,
        certifications: [],
        specializations: [],
      },
    });
  } else if (role === 'PARENT') {
    await db.parent.create({
      data: {
        userId: newUser.id,
        childrenIds: [],
        communicationPrefs: {
          emailNotifications: true,
          smsNotifications: false,
        },
      },
    });
  }

  // Re-fetch with full includes
  return db.user.findUnique({
    where: { id: newUser.id },
    include: USER_INCLUDE,
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }

  // Populate RLS tenant context for all subsequent DB queries in this request.
  // PLATFORM_ADMIN gets bypass so they can access cross-tenant data.
  setTenantId(user.tenantId, user.role === 'PLATFORM_ADMIN');

  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export async function getUserFromClerkId(clerkId: string) {
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
  });
  return user;
}
