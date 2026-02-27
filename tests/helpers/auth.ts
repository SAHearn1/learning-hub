import { Page } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

export type UserRole = 'STUDENT' | 'EDUCATOR' | 'PARENT' | 'SCHOOL_ADMIN';

interface TestUser {
  clerkUserId: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  dbRole: string;
}

const defaultPassword = 'RwFw$E2e_Ts9!xQp';

export const TEST_USERS: Record<UserRole, TestUser> = {
  STUDENT: {
    clerkUserId: '',
    email: process.env.E2E_CLERK_USER_STUDENT_EMAIL ?? 'student.test@rootwork.edu',
    password: process.env.E2E_CLERK_USER_STUDENT_PASSWORD ?? defaultPassword,
    role: 'STUDENT',
    firstName: 'Alex',
    lastName: 'TestStudent',
    dbRole: 'STUDENT',
  },
  EDUCATOR: {
    clerkUserId: '',
    email: process.env.E2E_CLERK_USER_EDUCATOR_EMAIL ?? 'educator.test@rootwork.edu',
    password: process.env.E2E_CLERK_USER_EDUCATOR_PASSWORD ?? defaultPassword,
    role: 'EDUCATOR',
    firstName: 'Sarah',
    lastName: 'TestEducator',
    dbRole: 'EDUCATOR',
  },
  PARENT: {
    clerkUserId: '',
    email: process.env.E2E_CLERK_USER_PARENT_EMAIL ?? 'parent.test@rootwork.edu',
    password: process.env.E2E_CLERK_USER_PARENT_PASSWORD ?? defaultPassword,
    role: 'PARENT',
    firstName: 'Maria',
    lastName: 'TestParent',
    dbRole: 'PARENT',
  },
  SCHOOL_ADMIN: {
    clerkUserId: '',
    email: process.env.E2E_CLERK_USER_ADMIN_EMAIL ?? 'admin.test@rootwork.edu',
    password: process.env.E2E_CLERK_USER_ADMIN_PASSWORD ?? defaultPassword,
    role: 'SCHOOL_ADMIN',
    firstName: 'Robert',
    lastName: 'TestAdmin',
    dbRole: 'PLATFORM_ADMIN',
  },
};

export async function setupTestUsers() {
  const client = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  for (const [role, userData] of Object.entries(TEST_USERS)) {
    try {
      const existingUsers = await client.users.getUserList({
        emailAddress: [userData.email],
      });

      const existingUser = existingUsers.data[0];
      if (existingUser) {
        TEST_USERS[role as UserRole].clerkUserId = existingUser.id;
        console.log(`Test user exists: ${userData.email} (${existingUser.id})`);
        continue;
      }

      const user = await client.users.createUser({
        emailAddress: [userData.email],
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        publicMetadata: {
          role: userData.dbRole,
          tenantId: process.env.E2E_TEST_TENANT_ID ?? 'test-tenant-id',
        },
      });

      TEST_USERS[role as UserRole].clerkUserId = user.id;
      console.log(`Created test user: ${userData.email} (${user.id})`);
    } catch (error) {
      console.error(`Error creating test user ${userData.email}:`, error);
    }
  }
}

export async function loginAs(page: Page, role: UserRole) {
  const user = TEST_USERS[role];

  await page.goto('/');
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: user.email,
      password: user.password,
    },
  });
}

export async function logout(page: Page) {
  await clerk.signOut({ page });
}
