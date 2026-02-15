import { test as base } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Authentication fixtures for Playwright tests with Clerk.
 *
 * The global setup (global.setup.ts) signs in as each role via
 * @clerk/testing and saves the browser state to JSON files.
 * These fixtures load that saved state (cookies + localStorage)
 * into the test's browser context so pages are authenticated.
 */

type AuthFixtures = {
  authenticatedStudent: void;
  authenticatedEducator: void;
  authenticatedParent: void;
  authenticatedAdmin: void;
};

const clerkDir = path.join(__dirname, '../../../playwright/.clerk');

interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

function loadStorageState(role: string): StorageState {
  const statePath = path.join(clerkDir, `${role}.json`);
  if (!fs.existsSync(statePath)) {
    throw new Error(
      `Auth state file not found: ${statePath}. ` +
      'Run the global setup first: npx playwright test --project=setup'
    );
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

async function injectAuthState(page: any, role: string) {
  const state = loadStorageState(role);

  // Inject cookies from saved state
  if (state.cookies?.length) {
    await page.context().addCookies(state.cookies);
  }

  // Inject localStorage from saved state
  if (state.origins?.length) {
    for (const origin of state.origins) {
      if (origin.localStorage?.length) {
        await page.addInitScript((items: Array<{ name: string; value: string }>) => {
          for (const item of items) {
            localStorage.setItem(item.name, item.value);
          }
        }, origin.localStorage);
      }
    }
  }
}

export const test = base.extend<AuthFixtures>({
  authenticatedStudent: [async ({ page }, use) => {
    await injectAuthState(page, 'student');
    await use();
  }, { auto: false }],

  authenticatedEducator: [async ({ page }, use) => {
    await injectAuthState(page, 'educator');
    await use();
  }, { auto: false }],

  authenticatedParent: [async ({ page }, use) => {
    await injectAuthState(page, 'parent');
    await use();
  }, { auto: false }],

  authenticatedAdmin: [async ({ page }, use) => {
    await injectAuthState(page, 'admin');
    await use();
  }, { auto: false }],
});

export { expect } from '@playwright/test';
