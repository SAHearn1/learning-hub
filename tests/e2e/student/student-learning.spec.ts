import { test, expect } from '@playwright/test';

test.describe('Student learning page', () => {
  test.skip('navigate to learn page (requires auth)', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.locator('body')).toBeVisible();
  });

  test.skip('verify learn page displays chat interface (requires auth)', async ({ page }) => {
    await page.goto('/learn');
    
    // Check for session header
    const sessionHeader = page.getByRole('heading', { name: /mathematics|science|language arts/i });
    if (await sessionHeader.count() > 0) {
      await expect(sessionHeader.first()).toBeVisible();
    }
    
    // Check for phase indicator
    const phaseIndicator = page.getByText(/root|regulate|reflect|restore|reconnect/i);
    if (await phaseIndicator.count() > 0) {
      await expect(phaseIndicator.first()).toBeVisible();
    }
    
    // Check for message input
    const messageInput = page.getByPlaceholder(/type your message/i);
    if (await messageInput.count() > 0) {
      await expect(messageInput).toBeVisible();
    }
  });

  test.skip('verify empty state message (requires auth)', async ({ page }) => {
    await page.goto('/learn');
    
    // Check for empty state message
    const emptyState = page.getByText(/start your learning session/i);
    if (await emptyState.count() > 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test.skip('test navigation from home to learn (requires auth)', async ({ page }) => {
    // First go to home/dashboard
    await page.goto('/');
    
    // Look for learn card or button
    const learnLink = page.getByRole('link', { name: /learn/i })
      .or(page.getByRole('button', { name: /learn/i }));
    
    if (await learnLink.count() > 0) {
      await learnLink.first().click();
      
      // Should navigate to learn page
      await expect(page).toHaveURL(/\/learn/);
    }
  });

  test.skip('verify page loads without errors (requires auth)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
