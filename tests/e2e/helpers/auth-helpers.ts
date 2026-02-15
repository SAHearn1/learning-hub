import { Page } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';
import { TEST_USERS } from '../../helpers/auth';

/**
 * Authentication helper functions for E2E tests.
 * Uses @clerk/testing for programmatic sign-in/sign-out.
 */

export async function loginAsStudent(page: Page) {
  const user = TEST_USERS.STUDENT;
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

export async function loginAsEducator(page: Page) {
  const user = TEST_USERS.EDUCATOR;
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

export async function loginAsParent(page: Page) {
  const user = TEST_USERS.PARENT;
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

export async function loginAsAdmin(page: Page) {
  const user = TEST_USERS.SCHOOL_ADMIN;
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

export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
