import { test, expect } from '@playwright/test';

test.describe('Student learning page', () => {
  test.skip('navigate to learn page (requires auth)', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.locator('body')).toBeVisible();
  });

  test.skip('verify learn page displays correctly (requires auth)', async ({ page }) => {
    await page.goto('/learn');
    
    // Check for main content
    const mainContent = page.locator('main').or(page.locator('[data-testid="learn-content"]'));
    await expect(mainContent).toBeVisible();
  });

  test.skip('check placeholder text for Phase 2.1 (requires auth)', async ({ page }) => {
    await page.goto('/learn');
    
    // Look for phase information or coming soon message
    const phaseText = page.getByText(/phase 2/i)
      .or(page.getByText(/coming soon/i))
      .or(page.getByText(/under development/i));
    
    if (await phaseText.count() > 0) {
      await expect(phaseText.first()).toBeVisible();
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
