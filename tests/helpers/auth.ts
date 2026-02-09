import { Page } from '@playwright/test';
import { clerkClient } from '@clerk/nextjs/server';

export type UserRole = 'STUDENT' | 'EDUCATOR' | 'PARENT' | 'SCHOOL_ADMIN';

interface TestUser {
  clerkUserId: string;
  email: string;
  password: string;
  role: UserRole;
}

export const TEST_USERS: Record<UserRole, TestUser> = {
  STUDENT: {
    clerkUserId: '',
    email: 'student.test@rootwork.edu',
    password: 'Test123!@#',
    role: 'STUDENT',
  },
  EDUCATOR: {
    clerkUserId: '',
    email: 'educator.test@rootwork.edu',
    password: 'Test123!@#',
    role: 'EDUCATOR',
  },
  PARENT: {
    clerkUserId: '',
    email: 'parent.test@rootwork.edu',
    password: 'Test123!@#',
    role: 'PARENT',
  },
  SCHOOL_ADMIN: {
    clerkUserId: '',
    email: 'admin.test@rootwork.edu',
    password: 'Test123!@#',
    role: 'SCHOOL_ADMIN',
  },
};

export async function setupTestUsers() {
  const client = await clerkClient();

  for (const [role, userData] of Object.entries(TEST_USERS)) {
    try {
      const existingUsers = await client.users.getUserList({
        emailAddress: [userData.email],
      });

      const existingUser = existingUsers.data[0];
      if (existingUser) {
        TEST_USERS[role as UserRole].clerkUserId = existingUser.id;
        console.log(`Test user exists: ${userData.email}`);
        continue;
      }

      const user = await client.users.createUser({
        emailAddress: [userData.email],
        password: userData.password,
        firstName: role,
        lastName: 'Test',
        publicMetadata: {
          role: userData.role,
          tenantId: process.env.E2E_TEST_TENANT_ID ?? 'test-tenant-id',
        },
      });

      TEST_USERS[role as UserRole].clerkUserId = user.id;
      console.log(`Created test user: ${userData.email}`);
    } catch (error) {
      console.error(`Error creating test user ${userData.email}:`, error);
    }
  }
}

export async function loginAs(page: Page, role: UserRole) {
  const user = TEST_USERS[role];

  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', user.email);
  await page.click('button[type="submit"]');

  await page.waitForSelector('input[name="password"]');
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|learn|educator|parent)/);
}

export async function getSessionToken(role: UserRole): Promise<string> {
  const client = await clerkClient();
  const user = TEST_USERS[role];

  if (!user.clerkUserId) {
    throw new Error(`Clerk user ID for ${role} is not set. Run setupTestUsers first.`);
  }

  const sessions = await client.sessions.getSessionList({
    userId: user.clerkUserId,
  });

  const session = sessions.data[0];
  if (!session) {
    throw new Error(`No active sessions for ${role}`);
  }

  return session.id;
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="sign-out"]');
  await page.waitForURL('/');
}

