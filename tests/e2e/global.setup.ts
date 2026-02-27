import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { createClerkClient } from '@clerk/backend';
import { PrismaClient } from '@prisma/client';
import { TEST_USERS, type UserRole } from '../helpers/auth';

setup.describe.configure({ mode: 'serial' });
setup.setTimeout(60000); // sign-in involves network calls to Clerk

const STORAGE_DIR = path.join(__dirname, '../../playwright/.clerk');

const requiredClerkEnvForCi = [
  'CLERK_TESTING_TOKEN',
  'E2E_CLERK_USER_STUDENT_EMAIL',
  'E2E_CLERK_USER_STUDENT_PASSWORD',
  'E2E_CLERK_USER_EDUCATOR_EMAIL',
  'E2E_CLERK_USER_EDUCATOR_PASSWORD',
  'E2E_CLERK_USER_PARENT_EMAIL',
  'E2E_CLERK_USER_PARENT_PASSWORD',
  'E2E_CLERK_USER_ADMIN_EMAIL',
  'E2E_CLERK_USER_ADMIN_PASSWORD',
];


export const storageStatePaths: Record<string, string> = {
  STUDENT: path.join(STORAGE_DIR, 'student.json'),
  EDUCATOR: path.join(STORAGE_DIR, 'educator.json'),
  PARENT: path.join(STORAGE_DIR, 'parent.json'),
  SCHOOL_ADMIN: path.join(STORAGE_DIR, 'admin.json'),
};

// Step 1: Initialize Clerk testing token
setup('initialize clerk testing', async ({}) => {
  if (process.env.CI === 'true') {
    const missing = requiredClerkEnvForCi.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`Missing required Clerk E2E env vars in CI: ${missing.join(', ')}`);
    }
  }

  await clerkSetup();
});

// Step 2: Create test users in Clerk and seed database
setup('create test users in Clerk and database', async ({}) => {
  const clerkBackend = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
  const prisma = new PrismaClient();

  try {
    // Ensure test tenant exists
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'test-district' },
      update: {},
      create: {
        name: 'Test District',
        slug: 'test-district',
        domain: 'test.rootwork.edu',
        subscriptionTier: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE',
      },
    });

    for (const [role, userData] of Object.entries(TEST_USERS)) {
      // Create or find user in Clerk
      const existingUsers = await clerkBackend.users.getUserList({
        emailAddress: [userData.email],
      });

      let clerkUserId: string;
      if (existingUsers.data.length > 0) {
        clerkUserId = existingUsers.data[0].id;
        console.log(`Clerk user exists: ${userData.email} (${clerkUserId})`);
      } else {
        try {
          const newUser = await clerkBackend.users.createUser({
            emailAddress: [userData.email],
            password: userData.password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            publicMetadata: {
              role: userData.dbRole,
              tenantId: tenant.id,
            },
          });
          clerkUserId = newUser.id;
          console.log(`Created Clerk user: ${userData.email} (${clerkUserId})`);
        } catch (createError: any) {
          console.error(`Failed to create Clerk user ${userData.email}:`);
          console.error('Status:', createError.status);
          console.error('Errors:', JSON.stringify(createError.errors || createError.clerkError || createError.message, null, 2));
          throw createError;
        }
      }

      TEST_USERS[role as UserRole].clerkUserId = clerkUserId;

      // Upsert user in database
      const dbUser = await prisma.user.upsert({
        where: { clerkUserId },
        update: { email: userData.email },
        create: {
          clerkUserId,
          tenantId: tenant.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.dbRole as any,
          isMinor: role === 'STUDENT',
          consentStatus: role === 'STUDENT' ? 'GRANTED' : undefined,
        },
      });

      // Create role-specific records
      if (role === 'STUDENT') {
        await prisma.student.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: {
            userId: dbUser.id,
            gradeLevel: 7,
            learningPreferences: {},
            regulationProfile: {},
          },
        });
      } else if (role === 'EDUCATOR') {
        await prisma.educator.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: {
            userId: dbUser.id,
            certifications: [],
            specializations: [],
          },
        });
      } else if (role === 'PARENT') {
        await prisma.parent.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: {
            userId: dbUser.id,
            childrenIds: [],
            communicationPrefs: {},
          },
        });
      }

      console.log(`Database user ready: ${userData.email} (role: ${userData.dbRole})`);
    }
  } finally {
    await prisma.$disconnect();
  }
});

// Step 3: Sign in as each role and save browser state
const roles: Array<{ key: UserRole; label: string }> = [
  { key: 'STUDENT', label: 'student' },
  { key: 'EDUCATOR', label: 'educator' },
  { key: 'PARENT', label: 'parent' },
  { key: 'SCHOOL_ADMIN', label: 'admin' },
];

for (const { key, label } of roles) {
  setup(`authenticate as ${label} and save state`, async ({ page }) => {
    const userData = TEST_USERS[key];

    // Navigate to sign-in page (homepage has a pre-existing runtime error)
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded');

    // Sign in using Clerk's programmatic sign-in
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: userData.email,
        password: userData.password,
      },
    });

    // Wait for auth to settle
    await page.waitForTimeout(1000);

    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    // Save authenticated browser state
    await page.context().storageState({
      path: storageStatePaths[key],
    });

    console.log(`Saved auth state for ${label}: ${storageStatePaths[key]}`);
  });
}
