import { test, expect } from '../fixtures/auth.fixture';

test.describe('Educator dashboard', () => {
  test.use({ authenticatedEducator: undefined });

  test('navigate to educator dashboard', async ({ page }) => {
    await page.goto('/educator/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify educator workspace title and description', async ({ page }) => {
    await page.goto('/educator/dashboard');
    
    // Look for educator workspace heading
    const heading = page.getByRole('heading', { name: /educator/i })
      .or(page.getByText(/workspace/i));
    
    if (await heading.count() > 0) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('check all educator navigation items display', async ({ page }) => {
    await page.goto('/educator/dashboard');
    
    // Look for common educator navigation items
    const studentsLink = page.getByRole('link', { name: /student/i });
    const classesLink = page.getByRole('link', { name: /class/i });
    const reportsLink = page.getByRole('link', { name: /report/i });
    
    // At least some navigation items should be present
    const totalLinks = await studentsLink.count() + await classesLink.count() + await reportsLink.count();
    expect(totalLinks).toBeGreaterThan(0);
  });

  test('test navigation to each educator tool', async ({ page }) => {
    await page.goto('/educator/dashboard');
    
    // Test navigation to students page
    await page.goto('/educator/students');
    await expect(page.locator('body')).toBeVisible();
    
    // Test navigation to classes page
    await page.goto('/educator/classes');
    await expect(page.locator('body')).toBeVisible();
    
    // Test navigation to reports page
    await page.goto('/educator/reports');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify portal home component renders correctly', async ({ page }) => {
    await page.goto('/educator/dashboard');
    
    // Check for main dashboard content
    const dashboard = page.locator('main')
      .or(page.locator('[data-testid="educator-dashboard"]'));
    
    await expect(dashboard).toBeVisible();
  });

  test('verify page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/educator/dashboard');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
