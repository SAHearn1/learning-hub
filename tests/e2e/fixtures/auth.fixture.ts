import { test as base, TestInfo } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Authentication fixtures for Playwright tests with Clerk.
 *
 * The global setup (global.setup.ts) signs in as each role via
 * @clerk/testing and saves the browser state to JSON files.
 *
 * Usage: enable auth for a describe block via test.use():
 *   test.use({ authenticatedStudent: true });
 *   test.use({ authenticatedEducator: true });
 *   test.use({ authenticatedParent: true });
 *   test.use({ authenticatedAdmin: true });
 *
 * The _authSetup auto-fixture reads these option flags and injects the
 * saved Clerk session (cookies + localStorage) before each test.
 *
 * When auth state files are absent (Clerk credentials not configured),
 * the affected test is individually skipped with a diagnostic message
 * instead of failing the entire project.
 */

type AuthFixtures = {
  /** Set to true via test.use() to inject student Clerk session */
  authenticatedStudent: boolean;
  /** Set to true via test.use() to inject educator Clerk session */
  authenticatedEducator: boolean;
  /** Set to true via test.use() to inject parent Clerk session */
  authenticatedParent: boolean;
  /** Set to true via test.use() to inject admin Clerk session */
  authenticatedAdmin: boolean;
  /** Internal: auto fixture that reads the above options and injects state */
  _authSetup: void;
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

function loadStorageState(role: string): StorageState | null {
  const statePath = path.join(clerkDir, `${role}.json`);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

async function injectAuthState(page: any, role: string) {
  const state = loadStorageState(role);
  if (!state) return;

  if (state.cookies?.length) {
    await page.context().addCookies(state.cookies);
  }

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
  // Option fixtures — false by default; enable per describe with test.use({ authenticated*: true })
  authenticatedStudent: [false, { option: true }],
  authenticatedEducator: [false, { option: true }],
  authenticatedParent: [false, { option: true }],
  authenticatedAdmin: [false, { option: true }],

  /**
   * Auto fixture: runs for every test. When one of the option flags is
   * true, it locates the matching saved Clerk session and injects it.
   * If the session file is missing, the test is skipped individually.
   */
  _authSetup: [
    async (
      { page, authenticatedStudent, authenticatedEducator, authenticatedParent, authenticatedAdmin },
      use,
      testInfo: TestInfo,
    ) => {
      const roleMap: Record<string, boolean> = {
        student: authenticatedStudent,
        educator: authenticatedEducator,
        parent: authenticatedParent,
        admin: authenticatedAdmin,
      };

      const activeRole = Object.entries(roleMap).find(([, enabled]) => enabled)?.[0];

      if (activeRole) {
        const statePath = path.join(clerkDir, `${activeRole}.json`);
        if (!fs.existsSync(statePath)) {
          // Skip this test only; other tests are unaffected.
          testInfo.skip(
            true,
            `Clerk auth state not found for role "${activeRole}" (${statePath}). ` +
              'Configure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, and ' +
              'E2E_CLERK_USER_* environment variables, then run: ' +
              'npx playwright test --project=setup',
          );
          // testInfo.skip() throws SkipError — return is unreachable but keeps TS happy
          return;
        }
        await injectAuthState(page, activeRole);
      }

      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
