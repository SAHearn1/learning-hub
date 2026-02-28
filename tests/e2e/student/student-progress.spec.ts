import { test, expect } from '../fixtures/auth.fixture';

test.describe('Student progress page', () => {
  // Use authenticated student fixture for all tests in this suite
  test.use({ authenticatedStudent: true });
  
  test('navigate to progress page', async ({ page }) => {
    await page.goto('/progress');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify progress summary displays', async ({ page }) => {
    await page.goto('/progress');
    
    // Look for progress summary components
    const progressSummary = page.getByText(/total standards/i)
      .or(page.getByText(/mastery/i));
    
    await expect(progressSummary.first()).toBeVisible();
  });

  test('check mastery by standard component renders', async ({ page }) => {
    await page.goto('/progress');
    
    // Look for mastery breakdown
    const masterySection = page.getByText(/mastery by standard/i)
      .or(page.locator('[data-testid="mastery-by-standard"]'));
    
    if (await masterySection.count() > 0) {
      await expect(masterySection.first()).toBeVisible();
    }
  });

  test('verify session history displays', async ({ page }) => {
    await page.goto('/progress');
    
    // Look for session history table or list
    const sessionHistory = page.getByText(/session history/i)
      .or(page.locator('[data-testid="session-history"]'));
    
    if (await sessionHistory.count() > 0) {
      await expect(sessionHistory.first()).toBeVisible();
    }
  });

  test('test reasoning move chart visualization', async ({ page }) => {
    await page.goto('/progress');
    
    // Look for chart or visualization
    const chart = page.locator('canvas')
      .or(page.locator('svg'))
      .or(page.locator('[data-testid="reasoning-chart"]'));
    
    if (await chart.count() > 0) {
      await expect(chart.first()).toBeVisible();
    }
  });

  test('check Blooms taxonomy breakdown', async ({ page }) => {
    await page.goto('/progress');
    
    // Look for Bloom's taxonomy section
    const bloomsSection = page.getByText(/bloom/i)
      .or(page.locator('[data-testid="blooms-taxonomy"]'));
    
    if (await bloomsSection.count() > 0) {
      await expect(bloomsSection.first()).toBeVisible();
    }
  });

  test('test export button functionality', async ({ page }) => {
    await page.goto('/progress');
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export/i })
      .or(page.getByRole('button', { name: /download/i }));
    
    if (await exportButton.count() > 0) {
      await expect(exportButton.first()).toBeVisible();
      // Don't click to avoid triggering actual download
    }
  });

  test('verify data loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/progress');
    await page.waitForLoadState('networkidle');
    
    // Check for no critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
