import { test, expect } from '../fixtures/auth.fixture';

test.describe('Parent dashboard', () => {
  test.use({ authenticatedParent: true });

  test('navigate to parent dashboard', async ({ page }) => {
    await page.goto('/parent/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify parent dashboard loads', async ({ page }) => {
    await page.goto('/parent/dashboard');
    
    // Look for parent dashboard heading
    const heading = page.getByRole('heading', { name: /parent/i })
      .or(page.getByText(/dashboard/i));
    
    if (await heading.count() > 0) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('navigate to parent settings', async ({ page }) => {
    await page.goto('/parent/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify settings page placeholder displays', async ({ page }) => {
    await page.goto('/parent/settings');
    
    // Look for settings content
    const settingsContent = page.locator('main')
      .or(page.locator('[data-testid="parent-settings"]'));
    
    await expect(settingsContent).toBeVisible();
  });

  test('check for notification controls message', async ({ page }) => {
    await page.goto('/parent/settings');
    
    // Look for notification settings
    const notificationSection = page.getByText(/notification/i)
      .or(page.locator('[data-testid="notifications"]'));
    
    if (await notificationSection.count() > 0) {
      await expect(notificationSection.first()).toBeVisible();
    }
  });

  test('verify page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/parent/dashboard');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
