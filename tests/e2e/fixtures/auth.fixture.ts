import { test as base, Page } from '@playwright/test';

/**
 * Authentication fixture for Playwright tests with Clerk
 * 
 * This implementation uses Clerk session injection for E2E testing.
 * Each fixture sets up authentication for different user roles using
 * the test users created in seed data.
 * 
 * Reference: https://clerk.com/docs/testing/playwright
 */

type AuthFixtures = {
  authenticatedStudent: void;
  authenticatedEducator: void;
  authenticatedParent: void;
  authenticatedAdmin: void;
};

/**
 * Helper function to inject Clerk session for testing
 * This simulates an authenticated user by setting Clerk's session cookie
 */
async function setupClerkSession(page: Page, clerkUserId: string) {
  // For E2E testing, we inject the Clerk user ID into the session
  // In a real Clerk setup, this would use their testing tokens API
  await page.context().addCookies([
    {
      name: '__session',
      value: clerkUserId,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Also set localStorage for Clerk client-side state
  await page.addInitScript((userId: string) => {
    // Mock Clerk session in localStorage
    const mockClerkSession = {
      userId: userId,
      sessionId: `sess_${userId}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    localStorage.setItem('__clerk_db_jwt', JSON.stringify({ sessionId: `sess_${userId}` }));
    localStorage.setItem('__clerk_session', JSON.stringify(mockClerkSession));
  }, clerkUserId);
}

/**
 * Extended test with authentication fixtures
 * 
 * Usage:
 * ```typescript
 * test.use({ authenticatedStudent: undefined });
 * test('student can view progress', async ({ page }) => {
 *   await page.goto('/progress');
 *   // Test authenticated student flows
 * });
 * ```
 */
export const test = base.extend<AuthFixtures>({
  authenticatedStudent: async ({ page }, use) => {
    // Set up Clerk session for test student: Alex Martinez
    await setupClerkSession(page, 'clerk_student_demo_001');
    await use();
  },

  authenticatedEducator: async ({ page }, use) => {
    // Set up Clerk session for test educator: Ms. Johnson
    await setupClerkSession(page, 'clerk_educator_demo_001');
    await use();
  },

  authenticatedParent: async ({ page }, use) => {
    // Set up Clerk session for test parent: Maria Martinez
    await setupClerkSession(page, 'clerk_parent_demo_001');
    await use();
  },

  authenticatedAdmin: async ({ page }, use) => {
    // Set up Clerk session for test admin: Robert Admin
    await setupClerkSession(page, 'clerk_admin_demo_001');
    await use();
  },
});

export { expect } from '@playwright/test';
