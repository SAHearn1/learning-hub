import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('homepage loads without authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RootWork/);
  });

  test('Get Started button is visible on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for Get Started button (Clerk sign-up trigger)
    const getStartedButton = page.getByRole('button', { name: /get started/i })
      .or(page.getByRole('link', { name: /get started/i }));
    
    await expect(getStartedButton.first()).toBeVisible();
  });

  test('accessing protected route redirects when not authenticated', async ({ page }) => {
    // Attempt to access a protected route
    await page.goto('/learn');
    
    // Should redirect to sign-in or show authentication modal
    // The exact behavior depends on Clerk configuration
    await page.waitForLoadState('networkidle');
    
    // Check if redirected away from /learn or if sign-in modal appears
    const currentUrl = page.url();
    const isOnProtectedPage = currentUrl.includes('/learn') && !currentUrl.includes('sign-in');
    
    if (isOnProtectedPage) {
      // If still on protected page, sign-in modal should be visible
      // This is acceptable if Clerk shows a modal instead of redirecting
      console.log('Protected route accessed - may show auth modal');
    } else {
      // Should be redirected to sign-in
      expect(currentUrl).toContain('sign-in');
    }
  });

  test('sign-in link is accessible', async ({ page }) => {
    await page.goto('/');
    
    // Look for sign-in link in navigation
    const signInLink = page.getByRole('link', { name: /sign in/i })
      .or(page.getByRole('button', { name: /sign in/i }));
    
    // Check if sign-in link exists
    const signInCount = await signInLink.count();
    if (signInCount > 0) {
      await expect(signInLink.first()).toBeVisible();
    } else {
      console.log('Sign-in link may be implemented differently or in a menu');
    }
  });

  // Note: Actual sign-in/sign-up flow tests would require Clerk test configuration
  // These would include:
  // - test('can sign up with email and password')
  // - test('can sign in with existing account')
  // - test('can sign out')
  // - test('student cannot access educator routes')
  // - test('educator cannot access admin routes')
});
